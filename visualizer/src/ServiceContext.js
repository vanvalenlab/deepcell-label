import { useSelector } from '@xstate/react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import service from './service/service';

export const LabelContext = createContext();

export const useProject = () => {
  return useReturnContext(LabelContext);
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
  const image = useImage();
  const raw = useSelector(image, state => state.context.rawRef);
  return raw;
}

export function useLabeled() {
  const image = useImage();
  const labeled = useSelector(image, state => state.context.labeledRef);
  return labeled;
}

export function useFeature() {
  const labeled = useLabeled();
  const features = useSelector(labeled, state => state.context.features);
  const feature = useSelector(labeled, state => state.context.feature);
  return features[feature];
}

export function useChannel(channel) {
  const raw = useRaw();
  const channels = useSelector(raw, state => state.context.channels);
  return channels[channel];
}

export function useLayer(layer) {
  const raw = useRaw();
  const layers = useSelector(raw, state => state.context.layers);
  return layers[layer];
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

export function useToolbar() {
  const project = useProject();
  const toolbar = useSelector(project, state => state.context.toolRef);
  return toolbar;
}

export function useTool() {
  const project = useProject();
  const toolbar = useSelector(project, state => state.context.toolRef);
  const tool = useSelector(toolbar, state => state.context.toolActor);
  return tool;
}

const ServiceContext = props => {
  return <LabelContext.Provider value={service}>{props.children}</LabelContext.Provider>;
};

export default ServiceContext;
