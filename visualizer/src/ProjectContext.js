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

export function useSelect() {
  const project = useProject();
  const select = useSelector(project, state => state.context.selectRef);
  return select;
}

export function useTracking(label) {
  const project = useProject();
  const tracking = useSelector(project, state => {
    const labelMode = state.context.toolRef;
    const track = labelMode.state.context.trackRef;
    return track;
  });
  return tracking;
}

const emptyDivision = {
  parent: null,
  daughters: [],
  divisionFrame: null,
  parentDivisionFrame: null,
  frames: [],
};

export function useDivision(label) {
  const project = useProject();
  const division = useSelector(project, state => {
    const labelMode = state.context.toolRef;
    const track = labelMode.state.context.trackRef;
    const labels = track.state.context.labels;
    const division = labels[label];
    return division || emptyDivision;
  });
  return division;
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

export function useFeature() {
  const project = useProject();
  const feature = useSelector(project, state => {
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
  const channel = useSelector(project, state => {
    const image = state.context.imageRef;
    const raw = image.state.context.rawRef;
    const channels = raw.state.context.channels;
    return channels[channelId];
  });
  return channel;
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

export function useLabelMode() {
  const project = useProject();
  const labelMode = useSelector(project, state => state.context.toolRef);
  return labelMode;
}

export function useSegment() {
  const project = useProject();
  const segment = useSelector(project, state => {
    const tool = state.context.toolRef;
    const segment = tool.state.context.segmentRef;
    return segment;
  });
  return segment;
}

export function useTrack() {
  const project = useProject();
  const track = useSelector(project, state => {
    const tool = state.context.toolRef;
    const track = tool.state.context.trackRef;
    return track;
  });
  return track;
}

export function useBrush() {
  const project = useProject();
  const tool = useSelector(project, state => {
    const segment = state.context.segmentRef;
    const tools = segment.state.context.tools;
    return tools.brush;
  });
  return tool;
}

export function useThreshold() {
  const project = useProject();
  const tool = useSelector(project, state => {
    const labelMode = state.context.toolRef;
    const segment = labelMode.state.context.segmentRef;
    const tools = segment.state.context.tools;
    return tools.threshold;
  });
  return tool;
}

function ProjectContext({ project, children }) {
  return <Context.Provider value={project}>{children}</Context.Provider>;
}

export default ProjectContext;
