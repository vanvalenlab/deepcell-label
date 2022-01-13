import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useCanvas, useDrawCanvas, useLayers } from '../../ProjectContext';
import ChannelCanvas from './ChannelCanvas';

export const RGBCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const layers = useLayers();
  // keys: layer index, values: ref to canvas for each layer
  const [layerCanvases, setLayerCanvases] = useState({});
  const canvasRef = useDrawCanvas();

  useEffect(() => {
    canvasRef.current.getContext('2d').globalCompositeOperation = 'lighter';
  }, [canvasRef]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    for (let key in layerCanvases) {
      ctx.drawImage(layerCanvases[key], 0, 0);
    }
    setCanvases((canvases) => ({ ...canvases, raw: canvasRef.current }));
  }, [layerCanvases, width, height, setCanvases, canvasRef]);

  return layers.map((layer) => (
    <ChannelCanvas layer={layer} setCanvases={setLayerCanvases} key={layer.sessionId} />
  ));
};

export default RGBCanvas;
