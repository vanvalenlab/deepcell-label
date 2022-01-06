import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useSelect } from '../ProjectContext';

export const ComposeCanvas = ({ children }) => {
  const select = useSelect();

  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);
  const scale = useSelector(canvas, (state) => state.context.scale);

  // prevent scrolling page when over canvas
  useEffect(() => {
    const composeCanvas = document.getElementById('composeCanvas');
    const wheelListener = (e) => e.preventDefault();
    const spaceListener = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
      }
    };
    composeCanvas.addEventListener('wheel', wheelListener);
    document.addEventListener('keydown', spaceListener);
    return () => {
      composeCanvas.removeEventListener('wheel', wheelListener);
      document.removeEventListener('keydown', spaceListener);
    };
  }, []);

  const handleMouseDown = (event) => {
    event.preventDefault();
    if (event.shiftKey) {
      select.send({ ...event, type: 'SHIFT_CLICK' });
    } else {
      canvas.send(event);
    }
  };

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
    ctx.current.globalCompositeOperation = 'source-over'; // default
  }, [width, height]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, width, height);
    for (const child of children) {
      console.log(child, child instanceof HTMLCanvasElement);
      if (child instanceof HTMLCanvasElement) {
        ctx.current.drawImage(child, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
      }
    }
  }, [children, sx, sy, sw, sh, zoom, width, height]);

  return (
    <canvas
      id={'composeCanvas'}
      boxShadow={10}
      width={width}
      height={height}
      onMouseMove={canvas.send}
      onWheel={canvas.send}
      onMouseDown={handleMouseDown}
      onMouseUp={canvas.send}
      ref={canvasRef}
    />
  );
};

export default ComposeCanvas;
