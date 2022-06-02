import { useSelector } from '@xstate/react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

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
  const segment = useSegment();
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

export function useEditing() {
  const polaris = process.env.REACT_APP_SPOTS_VISUALIZER === 'true';
  const caliban = process.env.REACT_APP_CALIBAN_VISUALIZER === 'true';
  return !polaris && !caliban;
}

export function useSpots() {
  const project = useProject();
  const spots = useSelector(project, (state) => state.context.spotsRef);
  return spots;
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
  const editing = useEditing();

  return divisions.filter((d) => d.parent === cell);
}

/** Returns the divisions where the cell is a daughter if any. */
export function useDaughterDivisions(cell) {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);
  return divisions.filter((d) => d.daughters.includes(cell));
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

export function useSegment() {
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

export function useHexColormap() {
  const cells = useCells();
  const colormap = useSelector(cells, (state) => state.context.colormap);
  return colormap.map(rgbToHex);
}

const gl2 = !!document.createElement('canvas').getContext('webgl2');
const gl = !!document.createElement('canvas').getContext('webgl');

/** Creates a reference to a canvas with an alpha channel to use with a GPU.js kernel. */
export function useAlphaKernelCanvas() {
  const project = useProject();
  const width = useSelector(useCanvas(), (state) => state.context.width);
  const height = useSelector(useCanvas(), (state) => state.context.height);
  const [canvas, setCanvas] = useState(document.createElement('canvas'));

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    if (gl2) {
      canvas.getContext('webgl2', { premultipliedAlpha: false });
    } else if (gl) {
      canvas.getContext('webgl', { premultipliedAlpha: false });
    }
    setCanvas(canvas);
  }, [project, width, height]);

  return canvas;
}

/** Creates a canvas with the same dimensions as the project. */
export function usePixelatedCanvas() {
  const [canvas, setCanvas] = useState(document.createElement('canvas'));

  const canvasMachine = useCanvas();
  const width = useSelector(canvasMachine, (state) => state.context.width);
  const height = useSelector(canvasMachine, (state) => state.context.height);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    setCanvas(canvas);
  }, [height, width]);

  return canvas;
}

/** Creates a canvas with the same resolution as the displayed canvas.. */
export function useFullResolutionCanvas() {
  const [canvas] = useState(document.createElement('canvas'));

  const canvasMachine = useCanvas();
  const sw = useSelector(canvasMachine, (state) => state.context.width);
  const sh = useSelector(canvasMachine, (state) => state.context.height);
  const scale = useSelector(canvasMachine, (state) => state.context.scale);
  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  useEffect(() => {
    canvas.width = width;
    canvas.height = height;
  }, [canvas, height, width]);

  return canvas;
}

export function useCells() {
  const project = useProject();
  const cells = useSelector(project, (state) => state.context.cellsRef);
  return cells;
}

function ProjectContext({ project, children }) {
  return <Context.Provider value={project}>{children}</Context.Provider>;
}

export default ProjectContext;
