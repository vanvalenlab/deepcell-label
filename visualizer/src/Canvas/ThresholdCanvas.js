import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useCanvas, useTool } from '../ServiceContext';
import { drawBox } from '../imageUtils';

const ThresholdCanvas = ({ className }) => {

  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const scale = useSelector(canvas, state => state.context.scale);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);
  
  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const threshold = useTool();
  const x1 = useSelector(threshold, state => state.context.x);
  const y1 = useSelector(threshold, state => state.context.y);
  const [x2, y2] = useSelector(threshold, state => state.context.firstPoint);
  const show = useSelector(threshold, state => state.matches('dragging'));

  const canvasRef = useRef();
  const ctxRef = useRef();
  useEffect(() => {
    ctxRef.current = canvasRef.current.getContext('2d');
    ctxRef.current.imageSmoothingEnabled = false;
  }, [width, height]);

  // create references to draw the bounding box
  const boxCanvasRef = useRef();
  const boxCtxRef = useRef();
  useEffect(() => {
    boxCtxRef.current = boxCanvasRef.current.getContext('2d');
  }, [sw, sh]);

  // draws the box
  useEffect(() => {
    const boxCtx = boxCtxRef.current;
    boxCtx.clearRect(0, 0, sw, sh);
    if (show) { drawBox(boxCtx, x1, y1, x2, y2); }
  }, [show, x1, y1, x2, y2, sw, sh]);

  // draws the brush outline and trace onto the visible canvas
  useEffect(() => {
    const ctx = ctxRef.current;
    const boxCanvas = boxCanvasRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(
      boxCanvas,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
  }, [show, x1, y1, x2, y2, sx, sy, zoom, sw, sh, width, height]);

  return <>
    <canvas id='threshold-processing'
      hidden={true}
      ref={boxCanvasRef}
      width={sw}
      height={sh}
    />
    <canvas id='threshold-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  </>;
};

export default ThresholdCanvas;