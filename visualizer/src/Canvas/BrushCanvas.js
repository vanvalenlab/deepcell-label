import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useTool } from '../ServiceContext';

const distance = (x, y) => {
  return Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2));
};

/**
 * Returns whether the pixel at (x, y) of the brush bounding box is on the brush border.
 * @param {*} x 
 * @param {*} y 
 * @param {*} brushSize 
 * @returns {boolean}
 */
const onBrush = (x, y, brushSize) => {
  const radius = brushSize - 1;
  return Math.floor(distance(x - radius, y - radius)) === radius &&
    // not on border if next to border in both directions
    !(Math.floor(distance(Math.abs(x - radius) + 1, y - radius)) === radius && 
      Math.floor(distance(x - radius, Math.abs(y - radius) + 1)) === radius)
};

/**
 * Returns whether the pixel at (x, y) of the brush bounding box is inside the brush.
 * @param {*} x 
 * @param {*} y 
 * @param {*} brushSize 
 * @returns 
 */
const insideBrush = (x, y, brushSize) => {
  const radius = brushSize - 1;
  return Math.floor(distance(x - radius, y - radius)) <= radius;
}

/**
 * Draws a a solid outline circle of radius brushSize on the context at (x, y).
 * @param {*} ctx 
 * @param {*} x 
 * @param {*} y 
 * @param {*} brushSize 
 */
const drawBrush = (ctx, x, y, brushSize) => {
  const [sx, sy, sw, sh] = [x - brushSize + 1, y - brushSize + 1, 2 * brushSize - 1, 2 * brushSize - 1];
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const { data, height, width } = imageData;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      if (onBrush(i, j, brushSize)) {
        data[(j * width + i) * 4 + 0] = 255;
        data[(j * width + i) * 4 + 1] = 255;
        data[(j * width + i) * 4 + 2] = 255;
        data[(j * width + i) * 4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(imageData, sx, sy);
}

/**
 * Draws a translucent, filled-in circle of radius brushSize on the context at (x, y).
 * @param {*} ctx 
 * @param {*} x 
 * @param {*} y 
 * @param {*} brushSize 
 */
const drawTrace = (ctx, x, y, brushSize) => {
  const [sx, sy, sw, sh] = [x - brushSize + 1, y - brushSize + 1, 2 * brushSize - 1, 2 * brushSize - 1];
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const { data, height, width } = imageData;
  const radius = brushSize - 1;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      if (insideBrush(i, j, brushSize)) {
        data[(j * width + i) * 4 + 0] = 255;
        data[(j * width + i) * 4 + 1] = 255;
        data[(j * width + i) * 4 + 2] = 255;
        data[(j * width + i) * 4 + 3] = 255 / 2;
      }
    }
  }
  ctx.putImageData(imageData, sx, sy);
};

const BrushCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {

  const tool = useTool();
  const x = useSelector(tool, state => state.context.x);
  const y = useSelector(tool, state => state.context.y);
  const trace = useSelector(tool, state => state.context.trace);
  const brushSize = useSelector(tool, state => state.context.brushSize);

  const canvasRef = useRef();
  const ctx = useRef();
  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [width, height]);

  // create references for the brush outline and trace
  const brushCanvas = useRef();
  const brushCtx = useRef();
  const traceCanvas = useRef();
  const traceCtx = useRef();
  useEffect(() => {
    brushCtx.current = brushCanvas.current.getContext('2d');
    traceCtx.current = traceCanvas.current.getContext('2d');
  }, [sw, sh]);

  // draws the brush outline
  useEffect(() => {
    brushCtx.current.clearRect(0, 0, sw, sh);
    drawBrush(brushCtx.current, x, y, brushSize);
  }, [brushCtx, x, y, brushSize, sh, sw]);

  // draws the brush trace
  useEffect(() => {
    if (trace.length === 0) { // clear the trace canvas
      traceCtx.current.clearRect(0, 0, sw, sh);
    } else { // add to trace
      const [tx, ty] = trace[trace.length - 1];
      drawTrace(traceCtx.current, tx, ty, brushSize);
    }
  }, [traceCtx, trace, brushSize, sh, sw]);

  // redraws the brush trace when resizing the brush size
  useEffect(() => {
    traceCtx.current.clearRect(0, 0, sh, sw);
    for (const [tx, ty] of trace) {
      drawTrace(traceCtx.current, tx, ty, brushSize);
    }
  }, [traceCtx, brushSize]);

  // draws the brush outline and trace onto the visible canvas
  useEffect(() => {
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(
      traceCanvas.current,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
    ctx.current.drawImage(
      brushCanvas.current,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
  }, [trace, brushSize, x, y, sx, sy, zoom, sw, sh, width, height]);

  return <>
    <canvas id='brush-processing'
      hidden={true}
      ref={brushCanvas}
      width={sw}
      height={sh}
    />
    <canvas id='trace-processing'
      hidden={true}
      ref={traceCanvas}
      width={sw}
      height={sh}
    />
    <canvas id='brush-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  </>;
};

export default React.memo(BrushCanvas);