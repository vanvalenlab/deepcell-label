import { useSelector } from '@xstate/react';
import colormap from 'colormap';
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

export function useRawArray(channel, frame) {
  const project = useProject();
  const buffer = useSelector(project, state => {
    const pyodide = state.context.pyodideRef;
    const { channels } = pyodide.state.context;
    return channels[channel][frame];
  });
  return buffer;
}

export function useLabelArray(feature, frame) {
  const project = useProject();
  const buffer = useSelector(project, state => {
    const pyodide = state.context.pyodideRef;
    const { features } = pyodide.state.context;
    return features[feature][frame];
  });
  return buffer;
}

export function useSelect() {
  const project = useProject();
  const select = useSelector(project, state => state.context.selectRef);
  return select;
}

export function useApi() {
  const project = useProject();
  const api = useSelector(project, state => state.context.apiRef);
  return api;
}

export function useUndo() {
  const project = useProject();
  const undo = useSelector(project, state => state.context.undoRef);
  return undo;
}

export function useImage() {
  const project = useProject();
  const image = useSelector(project, state => state.context.imageRef);
  return image;
}

export function useRaw() {
  const project = useProject();
  const raw = useSelector(project, state => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    return raw;
  });
  return raw;
}

export function useLabeled() {
  const project = useProject();
  const labeled = useSelector(project, state => {
    const image = state.context.imageRef;
    const labeled = image.state.context.labeledRef;
    return labeled;
  });
  return labeled;
}

export function useChannel(channelId) {
  const project = useProject();
  const channel = useSelector(project, state => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    const channels = raw.state.context.channels;
    return channels[channelId];
  });
  return channel;
}

export function useColormap(feature) {
  const project = useProject();
  const maxLabel = useSelector(project, state => {
    const pyodide = state.context.pyodideRef;
    const { semanticLabels } = pyodide.state.context;
    const maxLabel = Math.max(...Object.keys(semanticLabels[feature]));
    return maxLabel;
  });
  let colors = colormap({
    colormap: 'viridis',
    nshades: Math.max(9, maxLabel),
    format: 'rgba',
  });
  colors = colors.slice(0, maxLabel);
  colors.unshift([0, 0, 0, 1]); // Label 0 is black
  colors.push([255, 255, 255, 1]); // New label (maxLabel + 1) is white
  return colors;
}

export function useLayers() {
  const project = useProject();
  const layers = useSelector(project, state => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    const colorMode = raw.state.context.colorMode;
    const layers = colorMode.state.context.layers;
    return layers;
  });
  return layers;
}

export function useComposeLayers() {
  const canvas = useCanvas();
  const width = useSelector(canvas, state => state.context.width);
  const height = useSelector(canvas, state => state.context.height);

  // keys: layer index, values: canvas with image of each layer
  const [canvases, setCanvases] = useState({});

  const canvasRef = useRef();
  const ctxRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'lighter';
    ctxRef.current = ctx;
  }, [height, width]);

  useEffect(() => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, width, height);
    Object.values(canvases).forEach(canvas => ctx.drawImage(canvas, 0, 0));
  });

  return [canvasRef, canvases, setCanvases];
}

export function useCanvas() {
  const project = useProject();
  const canvas = useSelector(project, state => state.context.canvasRef);
  return canvas;
}

export function useSegment() {
  const project = useProject();
  const segment = useSelector(project, state => state.context.segmentRef);
  return segment;
}

export function useTool() {
  const project = useProject();
  const tool = useSelector(project, state => {
    const segment = state.context.segmentRef;
    const tool = segment.state.context.toolActor;
    return tool;
  });
  return tool;
}

const ProjectContext = props => {
  return <Context.Provider value={props.project}>{props.children}</Context.Provider>;
};

export default ProjectContext;
