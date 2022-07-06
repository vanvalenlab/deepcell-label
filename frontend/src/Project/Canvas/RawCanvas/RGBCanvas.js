import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useCanvas, useLayers, useProject } from '../../ProjectContext';
import ChannelCanvas from './ChannelCanvas';

export const RGBCanvas = ({ setBitmaps }) => {
  const project = useProject();
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const layers = useLayers();
  // keys: layer index, values: ref to canvas for each layer
  const [layerBitmaps, setLayerBitmaps] = useState({});
  const [composeCanvas] = useState(document.createElement('canvas'));

  useEffect(() => {
    composeCanvas.width = width;
    composeCanvas.height = height;
    composeCanvas.getContext('2d').globalCompositeOperation = 'lighter';
  }, [project, composeCanvas, width, height]);

  useEffect(() => {
    const ctx = composeCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    for (let key in layerBitmaps) {
      ctx.drawImage(layerBitmaps[key], 0, 0);
    }
    createImageBitmap(composeCanvas).then((bitmap) => {
      setBitmaps((bitmaps) => ({ ...bitmaps, raw: bitmap }));
    });
  }, [layerBitmaps, width, height, setBitmaps, composeCanvas]);

  return layers.map((layer) => (
    <ChannelCanvas layer={layer} setBitmaps={setLayerBitmaps} key={layer.sessionId} />
  ));
};

export default RGBCanvas;
