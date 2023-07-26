import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { GPU } from 'gpu.js';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Cells from './cells';

export const Context = createContext();

export const useProject = () => {
  return useReturnContext(Context);
};

function useReturnContext(contextType) {
  const context = useContext(contextType);
  if (context === undefined) {
    throw new Error(`${contextType} must be used within its appropriate parent provider`);
  }
  return context;
}

export function useSelectedCell() {
  // Get selected cell from each labeling mode
  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);
  return cell;
}

/** Returns a list of the cells under the cursor. */
export function useHovering() {
  const project = useProject();
  const hoveringRef = useSelector(project, (state) => state.context.hoveringRef);
  const hovering = useSelector(hoveringRef, (state) => state.context.hovering);
  return hovering;
}

/** Returns the other selected cell when using the flood, replace, or swap tools.
 * When these tools are not in use, returns null instead.
 */
export function useOtherSelectedCell() {
  const segment = useEditSegment();
  const segmentTool = useSelector(segment, (state) => state.context.tool);

  const editCells = useEditCells();
  const cellsTool = useSelector(editCells, (state) => state.context.tool);

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('editSegment') ? 'segment' : state.matches('editCells') ? 'cells' : false
  );

  const flood = useFlood();
  const floodCell = useSelector(flood, (state) => state.context.floodCell);
  const replace = useReplace();
  const replaceCell = useSelector(replace, (state) => state.context.replaceCell);
  const swap = useSwap();
  const swapCell = useSelector(swap, (state) => state.context.swapCell);

  if (segmentTool === 'flood' && mode === 'segment') {
    return floodCell;
  }
  if (cellsTool === 'replace' && mode === 'cells') {
    return replaceCell;
  }
  if (cellsTool === 'swap' && mode === 'cells') {
    return swapCell;
  }
  return null;
}

/**
 * Return a ref that adds mousetrap to its className.
 * By default keyboard events will not fire inside of a textarea, input, or select.
 * Elements with the mousetrap class will fire keybinds. */
export function useMousetrapRef() {
  return (input) => {
    if (input && !input?.className?.includes('mousetrap')) {
      input.className = `${input?.className} mousetrap`;
    }
  };
}

export function useSpots() {
  const project = useProject();
  const spots = useSelector(project, (state) => state.context.spotsRef);
  return spots;
}

export function useCellTypes() {
  const project = useProject();
  const cellTypes = useSelector(project, (state) => state.context.cellTypesRef);
  return cellTypes;
}

export function useChannelExpression() {
  const project = useProject();
  const channelExpression = useSelector(project, (state) => state.context.channelExpressionRef);
  return channelExpression;
}

export function useTraining() {
  const project = useProject();
  const training = useSelector(project, (state) => state.context.trainingRef);
  return training;
}

export function useDivisions() {
  const project = useProject();
  const divisions = useSelector(project, (state) => state.context.divisionsRef);
  return divisions;
}

/** Returns the divisions where the cell is a parent if any. */
export function useParentDivisions(cell) {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);
  return divisions.filter((d) => d.parent === cell);
}

/** Returns the divisions where the cell is a daughter if any. */
export function useDaughterDivisions(cell) {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);
  return divisions.filter((d) => d.daughters.includes(cell));
}

export function useIdb() {
  const project = useProject();
  const idb = useSelector(project, (state) => state.context.idbRef);
  return idb;
}

export function useArrays() {
  const project = useProject();
  const arrays = useSelector(project, (state) => state.context.arraysRef);
  return arrays;
}

export function useSelect() {
  const project = useProject();
  const select = useSelector(project, (state) => state.context.selectRef);
  return select;
}

export function useEditDivisions() {
  const project = useProject();
  const editDivisions = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    return labelMode.state.context.editDivisionsRef;
  });
  return editDivisions;
}

export function useEditCellTypes() {
  const project = useProject();
  const editCellTypes = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    return labelMode.state.context.editCellTypesRef;
  });
  return editCellTypes;
}

export function useEditCells() {
  const project = useProject();
  const editCells = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    return labelMode.state.context.editCellsRef;
  });
  return editCells;
}

export function useSegmentApi() {
  const project = useProject();
  const api = useSelector(project, (state) => {
    const arrays = state.context.arraysRef;
    const api = arrays.children.get('api');
    return api;
  });
  return api;
}

export function useExport() {
  const project = useProject();
  const export_ = useSelector(project, (state) => state.context.exportRef);
  return export_;
}

export function useUndo() {
  const project = useProject();
  const undo = useSelector(project, (state) => state.context.undoRef);
  return undo;
}

export function useImage() {
  const project = useProject();
  const image = useSelector(project, (state) => state.context.imageRef);
  return image;
}

export function useRaw() {
  const project = useProject();
  const raw = useSelector(project, (state) => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    return raw;
  });
  return raw;
}

export function useLabeled() {
  const project = useProject();
  const labeled = useSelector(project, (state) => {
    const image = state.context.imageRef;
    const labeled = image.state.context.labeledRef;
    return labeled;
  });
  return labeled;
}

export function useFeature() {
  const project = useProject();
  const feature = useSelector(project, (state) => {
    const image = state.context.imageRef;
    const labeled = image.state.context.labeledRef;
    const features = labeled.state.context.features;
    const feature = labeled.state.context.feature;
    return features[feature];
  });
  return feature;
}

export function useChannel(channelId) {
  const project = useProject();
  const channel = useSelector(project, (state) => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    const channels = raw.state.context.channels;
    return channels[channelId];
  });
  return channel;
}

export function useLayers() {
  const project = useProject();
  const layers = useSelector(project, (state) => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    const layers = raw.state.context.layers;
    return layers;
  });
  return layers;
}

export function useComposeLayers() {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  // keys: layer index, values: canvas with image of each layer
  const [canvases, setCanvases] = useState({});

  const canvasRef = useRef();
  const ctxRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctxRef.current = ctx;
  }, [height, width]);

  useEffect(() => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, width, height);
    Object.values(canvases).forEach((canvas) => ctx.drawImage(canvas, 0, 0));
  });

  return [canvasRef, canvases, setCanvases];
}

export function useCanvas() {
  const project = useProject();
  const canvas = useSelector(project, (state) => state.context.canvasRef);
  return canvas;
}

export function useLabelMode() {
  const project = useProject();
  const labelMode = useSelector(project, (state) => state.context.toolRef);
  return labelMode;
}

export function useEditSegment() {
  const project = useProject();
  const segment = useSelector(project, (state) => {
    const tool = state.context.toolRef;
    const segment = tool.state.context.editSegmentRef;
    return segment;
  });
  return segment;
}

export function useBrush() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const segment = labelMode.state.context.editSegmentRef;
    const tools = segment.state.context.tools;
    return tools.brush;
  });
  return tool;
}

export function useThreshold() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const segment = labelMode.state.context.editSegmentRef;
    const tools = segment.state.context.tools;
    return tools.threshold;
  });
  return tool;
}

export function useWatershed() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const segment = labelMode.state.context.editSegmentRef;
    const tools = segment.state.context.tools;
    return tools.watershed;
  });
  return tool;
}

export function useFlood() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const segment = labelMode.state.context.editSegmentRef;
    const tools = segment.state.context.tools;
    return tools.flood;
  });
  return tool;
}

export function useSwap() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const editCells = labelMode.state.context.editCellsRef;
    const tools = editCells.state.context.tools;
    return tools.swap;
  });
  return tool;
}

export function useReplace() {
  const project = useProject();
  const tool = useSelector(project, (state) => {
    const labelMode = state.context.toolRef;
    const editCells = labelMode.state.context.editCellsRef;
    const tools = editCells.state.context.tools;
    return tools.replace;
  });
  return tool;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(rgb) {
  return '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

export function useColormap() {
  const cells = useCellsMachine();
  const colormap = useSelector(cells, (state) => state.context.colormap);
  return colormap;
}

export function useHexColormap() {
  const cells = useCellsMachine();
  const colormap = useSelector(cells, (state) => state.context.colormap);
  return colormap.map(rgbToHex);
}

const gl2 = !!document.createElement('canvas').getContext('webgl2');
const gl = !!document.createElement('canvas').getContext('webgl');

const alphaGpuCanvas = document.createElement('canvas');
if (gl2) {
  alphaGpuCanvas.getContext('webgl2', { premultipliedAlpha: false });
} else if (gl) {
  alphaGpuCanvas.getContext('webgl', { premultipliedAlpha: false });
}
const alphaGpu = new GPU({ canvas: alphaGpuCanvas });

/** Provides a GPU that uses a canvas with premultipliedAlpha off. */
export function useAlphaGpu() {
  const project = useProject();
  const width = useSelector(useCanvas(), (state) => state.context.width);
  const height = useSelector(useCanvas(), (state) => state.context.height);

  useEffect(() => {
    alphaGpuCanvas.width = width;
    alphaGpuCanvas.height = height;
  }, [project, width, height]);

  return alphaGpu;
}

const gpuCanvas = document.createElement('canvas');
const gpu = new GPU({ canvas: gpuCanvas });

/** Provides a GPU that uses a canvas with the same dimensions as the labeled image. */
export function useGpu() {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  useEffect(() => {
    gpuCanvas.width = width;
    gpuCanvas.height = height;
  }, [height, width]);

  return gpu;
}

/** Creates a canvas with the same resolution as the displayed canvas. */
export function useFullResolutionCanvas() {
  const [canvas] = useState(document.createElement('canvas'));

  const canvasMachine = useCanvas();
  const [sw, sh, scale] = useSelector(
    canvasMachine,
    (state) => [state.context.width, state.context.height, state.context.scale],
    equal
  );
  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  useEffect(() => {
    canvas.width = width;
    canvas.height = height;
  }, [canvas, height, width]);

  return canvas;
}

export function useCellsMachine() {
  const project = useProject();
  const cellsMachine = useSelector(project, (state) => state.context.cellsRef);
  return cellsMachine;
}

export function useCells() {
  const project = useProject();
  const cellsMachine = useSelector(project, (state) => state.context.cellsRef);
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  return useMemo(() => new Cells(cells), [cells]);
}

export function useCellsAtTime() {
  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);
  const labeled = useLabeled();
  const c = useSelector(labeled, (state) => state.context.feature);
  const cells = useCells();
  const cellList = useMemo(() => cells.getCellsListAtTime(t, c), [cells, t, c]);
  return cellList;
}

export function useOverlaps() {
  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);
  const labeled = useLabeled();
  const c = useSelector(labeled, (state) => state.context.feature);
  const cells = useCells();
  const overlaps = useMemo(() => cells.getOverlaps(t, c), [cells, t, c]);
  return overlaps;
}

export function useReducedCellMatrix() {
  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);
  const labeled = useLabeled();
  const c = useSelector(labeled, (state) => state.context.feature);
  const cells = useCells();
  const cellMatrix = useMemo(() => cells.getReducedMatrix(t, c), [cells, t, c]);
  return cellMatrix;
}

export function useCellValueMapping() {
  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);
  const labeled = useLabeled();
  const c = useSelector(labeled, (state) => state.context.feature);
  const cells = useCells();
  const { mapping, lengths } = useMemo(() => cells.getCellMapping(t, c), [cells, t, c]);
  return { mapping, lengths };
}

export function useLabeledArray() {
  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);

  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeled && state.context.labeled[feature][t]
  );
  return labeledArray;
}

function ProjectContext({ project, children }) {
  return <Context.Provider value={project}>{children}</Context.Provider>;
}

export default ProjectContext;
