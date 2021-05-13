import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useInterpret, useSelector } from '@xstate/react';
import { useLocation } from "react-router-dom";
import createDeepcellLabelMachine from './statechart/deepcellLabelMachine';
import Hotkeys from './Hotkeys';


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

export function useFeature() {
  const image = useImage();
  const features = useSelector(image, state => state.context.features);
  const feature = useSelector(image, state => state.context.feature);
  return features[feature];
}

export function useChannel() {
  const image = useImage();
  const channels = useSelector(image, state => state.context.channels);
  const channel = useSelector(image, state => state.context.channel);
  return channels[channel];
}

export function useComposeChannels() {
  const canvas = useCanvas();
  const width = useSelector(canvas, state => state.context.width);
  const height = useSelector(canvas, state => state.context.height);

  // keys are channels indices (0, 1, 2, ...)
  // values are references to canvases containing the channel image
  // NOTE: as objects use reference equality, any assignment with setChannelRefs rerenders
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
  });

  return [canvasRef, canvases, setCanvases];

}

export function useCanvas() {
  const { service } = useLabelService();
  const { canvas } = service.state.children;
  return canvas;
}

export function useTool() {
  const { service } = useLabelService();
  const { tool } = service.state.children;
  return tool;
}

const ServiceContext = (props) => {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');
  const labelMachine = createDeepcellLabelMachine(projectId);
  const labelService = useInterpret(labelMachine); // , { devTools: true });
  labelService.start();

  return (
    <LabelContext.Provider value={labelService}>
      {props.children}
      <Hotkeys />
    </LabelContext.Provider>
  );
};

export default ServiceContext;
