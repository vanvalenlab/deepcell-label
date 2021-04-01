import React, { useEffect, useRef } from 'react';
import { useCanvas, useTool } from '../ServiceContext';

const distance = (x, y) => {
  return Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2));
};
const border = (x, y, cx, cy, radius) => {
  return Math.floor(distance(x - cx, y - cy) + 1) === radius &&
    // not on border if next to border in both directions
    !(Math.floor(distance(Math.abs(x - cx) + 1, y - cy) + 1) === radius && 
      Math.floor(distance(x - cx, Math.abs(y - cy) + 1) + 1) === radius)
};

const BrushCanvas = props => {
  const [currentCanvas, sendCanvas] = useCanvas();
  const { sx, sy, zoom, width, height } = currentCanvas.context;

  const [currentTool, sendTool] = useTool();
  const { x, y, trace, brushSize } = currentTool.context;

  const canvasRef = useRef();
  const ctx = useRef();
  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  // to convert the brush into an image
  const brushCanvas = new OffscreenCanvas(width, height);
  const brushCtx = brushCanvas.getContext('2d');
  useEffect(() => {
    const array = new Uint8ClampedArray(width * height * 4);
    for (let j = 0; j < height; j += 1) { // y
      for (let i = 0; i < width; i += 1) { // x
        if (border(i, j, x, y, brushSize)) {
          array[(j * width  + i) * 4 + 0] = 255;
          array[(j * width  + i) * 4 + 1] = 255;
          array[(j * width  + i) * 4 + 2] = 255;
          array[(j * width + i) * 4 + 3] = 255;
        } else {
          for (const [traceX, traceY] of trace) {
            if (distance(i - traceX, j - traceY) < brushSize) {
              array[(j * width  + i) * 4 + 0] = 255;
              array[(j * width  + i) * 4 + 1] = 255;
              array[(j * width  + i) * 4 + 2] = 255;
              array[(j * width + i) * 4 + 3] = 255 / 2;
            }
          }
        }
      }
    }
    const data = new ImageData(array, width, height);
    brushCtx.putImageData(data, 0, 0);
  }, [brushCtx, x, y, trace, brushSize, height, width]);


  // const traceCanvas = new OffscreenCanvas(width, height);
  // const traceCtx = traceCanvas.getContext('2d');

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      brushCanvas,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [brushCanvas, sx, sy, zoom, width, height, props.width, props.height]);

  return <canvas id='brush-canvas'
    ref={canvasRef}
    {...props}
  />;
};

export default BrushCanvas;