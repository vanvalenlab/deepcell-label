import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useInterpret, useSelector } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';
import Hotkeys from './Hotkeys';
import { invertImageData } from './imageUtils';


export const LabelContext = createContext();

export const useLabelService = () => {
  return {
    service: useReturnContext(LabelContext),
  };
};

function useReturnContext(contextType) {
    const context = useContext(contextType);
    if (context === undefined) {
        throw new Error(`${contextType} must be used within its appropriate parent provider`);
    }
    return context;
}

export function useUndo() {
  const { service } = useLabelService();
  const { undo } = service.state.children;
  return undo;
}

export function useImage() {
  const { service } = useLabelService();
  const { image } = service.state.children;
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
  const raw = useRaw();
  const invert = useSelector(raw, state => state.context.invert);

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
    Object.values(canvases).forEach(
      canvas => ctx.drawImage(canvas, 0, 0)
    );
    if (invert) {
      const imageData = ctx.getImageData(0, 0, width, height);
      invertImageData(imageData);
      ctx.putImageData(imageData, 0, 0);
    }
  });

  return [canvasRef, canvases, setCanvases];

}

export function useCanvas() {
  const { service } = useLabelService();
  const { canvas } = service.state.children;
  return canvas;
}

export function useToolbar() {
  const { service } = useLabelService();
  const { tool } = service.state.children;
  return tool;
}

export function useTool() {
  const { service } = useLabelService();
  const { tool: toolbar } = service.state.children;
  const tool = useSelector(toolbar, state => state.context.toolActor);
  return tool;
}

const ServiceContext = (props) => {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');
  const labelMachine = createDeepcellLabelMachine(projectId);
  const labelService = useInterpret(labelMachine); // , { devTools: true });
  labelService.start();
  window.dcl = labelService;

  return (
    <LabelContext.Provider value={labelService}>
      {props.children}
      <Hotkeys />
    </LabelContext.Provider>
  );
};

export default ServiceContext;
