import { styled } from '@mui/material/styles';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React, { useEffect, useRef, useState } from 'react';
import { useCanvas } from '../ProjectContext';

const Canvas = styled('canvas')``;

export const ComposeCanvas = ({ bitmaps }) => {
  const canvas = useCanvas();
  const { sx, sy, zoom, sw, sh, scale } = useSelector(
    canvas,
    ({ context: { sx, sy, zoom, width: sw, height: sh, scale } }) => ({
      sx,
      sy,
      zoom,
      sw,
      sh,
      scale,
    }),
    equal
  );

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const canvasRef = useRef();
  const [composeCanvas] = useState(document.createElement('canvas'));

  useEffect(() => {
    canvasRef.current.getContext('2d').imageSmoothingEnabled = false;
  }, [width, height]);

  useEffect(() => {
    composeCanvas.getContext('2d').globalCompositeOperation = 'source-over';
    composeCanvas.width = sw;
    composeCanvas.height = sh;
  }, [composeCanvas, sw, sh]);

  useEffect(() => {
    const ctx = composeCanvas.getContext('2d');
    ctx.clearRect(0, 0, sw, sh);
    // image sized canvases
    for (let key in bitmaps) {
      if (key !== 'spots') {
        ctx.drawImage(bitmaps[key], 0, 0);
      }
    }
  }, [bitmaps, sh, sw, composeCanvas]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(composeCanvas, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
    // display sized canvases
    if ('spots' in bitmaps) {
      ctx.drawImage(bitmaps['spots'], 0, 0);
    }
  }, [bitmaps, sx, sy, sw, sh, zoom, width, height, composeCanvas]);

  return (
    <Canvas
      id='canvas'
      data-testid='canvas'
      sx={{ position: 'absolute', top: 0, left: 0, maxHeight: '100%', maxWidth: '100%' }}
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
};

export default ComposeCanvas;
