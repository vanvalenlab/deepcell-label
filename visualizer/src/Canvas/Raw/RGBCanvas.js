import { useSelector } from '@xstate/react';
import React, { useEffect, useRef, useState } from 'react';
import { useCanvas, useLayers } from '../../ProjectContext';
import ChannelCanvas from './ChannelCanvasGPU';

export const RGBCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const scale = useSelector(canvas, (state) => state.context.scale);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const layers = useLayers();

  const canvasRef = useRef();
  const ctx = useRef();

  // keys: layer index, values: ref to canvas for each layer
  const [canvases, setCanvases] = useState({});

  const hiddenCanvasRef = useRef();
  const hiddenCtxRef = useRef();

  useEffect(() => {
    const hiddenCanvas = hiddenCanvasRef.current;
    const hiddenCtx = hiddenCanvas.getContext('2d');
    hiddenCtx.globalCompositeOperation = 'lighter';
    hiddenCtxRef.current = hiddenCtx;
  }, [sh, sw]);

  useEffect(() => {
    const hiddenCtx = hiddenCtxRef.current;
    hiddenCtx.clearRect(0, 0, sw, sh);
    Object.values(canvases).forEach((canvas) => hiddenCtx.drawImage(canvas, 0, 0));
  });

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    const hiddenCanvas = hiddenCanvasRef.current;
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(hiddenCanvas, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
  }, [canvases, sx, sy, zoom, sw, sh, width, height]);

  return (
    <>
      {/* hidden processing canvas */}
      <canvas id='compose-raw-canvas' hidden={true} ref={hiddenCanvasRef} width={sw} height={sh} />
      {/* visible output canvas */}
      <canvas id='raw-canvas' className={className} ref={canvasRef} width={width} height={height} />
      {layers.map((layer) => (
        <ChannelCanvas layer={layer} setCanvases={setCanvases} key={layer.sessionId} />
      ))}
    </>
  );
};

export default RGBCanvas;
