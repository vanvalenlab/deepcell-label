import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useCanvas, useLayers, usePixelatedCanvas, useProject } from '../../ProjectContext';
import ChannelCanvas from './ChannelCanvas';

export const RGBCanvas = ({ setBitmaps }) => {
  const project = useProject();
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const layers = useLayers();
  // keys: layer index, values: ref to canvas for each layer
  const [layerBitmaps, setLayerBitmaps] = useState({});
  const drawCanvas = usePixelatedCanvas();

  useEffect(() => {
    drawCanvas.getContext('2d').globalCompositeOperation = 'lighter';
  }, [drawCanvas, project]);

  useEffect(() => {
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    for (let key in layerBitmaps) {
      ctx.drawImage(layerBitmaps[key], 0, 0);
    }
    createImageBitmap(drawCanvas).then((bitmap) => {
      setBitmaps((bitmaps) => ({ ...bitmaps, raw: bitmap }));
    });
  }, [layerBitmaps, width, height, setBitmaps, drawCanvas]);

  return layers.map((layer) => (
    <ChannelCanvas layer={layer} setBitmaps={setLayerBitmaps} key={layer.sessionId} />
  ));
};

export default RGBCanvas;
