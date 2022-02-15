import { styled } from '@mui/material/styles';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useDrawCanvas } from '../ProjectContext';

const Canvas = styled('canvas')``;

export const ComposeCanvas = ({ canvases }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const canvasRef = useRef();
  const composeCanvas = useDrawCanvas();

  useEffect(() => {
    composeCanvas.getContext('2d').globalCompositeOperation = 'source-over';
  }, [composeCanvas]);

  useEffect(() => {
    canvasRef.current.getContext('2d').imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    const ctx = composeCanvas.getContext('2d');
    ctx.clearRect(0, 0, sw, sh);
    for (let key in canvases) {
      ctx.drawImage(canvases[key], 0, 0);
    }
  }, [canvases, sh, sw, composeCanvas]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(composeCanvas, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
  }, [canvases, sx, sy, sw, sh, zoom, width, height, composeCanvas]);

  return (
    <Canvas
      id='canvas'
      sx={{ position: 'absolute', top: 0, left: 0, maxHeight: '100%', maxWidth: '100%' }}
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
};

export default ComposeCanvas;
