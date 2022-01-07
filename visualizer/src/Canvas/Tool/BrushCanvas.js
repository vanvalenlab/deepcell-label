import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import React, { useEffect, useRef } from 'react';
import { useBrush, useCanvas, useSelect } from '../../ProjectContext';

const red = [255, 0, 0, 255];
const white = [255, 255, 255, 255];

/**
 * Computes the distance of (x, y) from the origin (0, 0).
 * @param {Number} x
 * @param {Number} y
 * @returns {Number} distance in pixels from origin
 */
function distance(x, y) {
  return Math.floor(Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2)));
}

/**
 * Computes whether a pixel at (x, y) is on the outline of a brush at (brushX, brushY) with size brushSize.
 * @param {Number} x x-coordinate of pixel
 * @param {Number} y y-coordinate of pixel
 * @param {Number} brushX x-coordinate of brush center
 * @param {Number} brushY y-coordinate of brush center
 * @param {Number} brushSize size of brush
 * @returns {boolean} whether the pixel is on the brush border
 */
function onBrush(x, y, brushX, brushY, brushSize) {
  const radius = brushSize - 1;
  return Math.floor(distance(brushX - x, brushY - y)) === radius; // &&
  // // not on border if next to border in both directions
  // !(
  //   Math.floor(distance(Math.abs(brushX - x) + 1, brushY - y)) === radius &&
  //   Math.floor(distance(brushX - x, Math.abs(brushY - y) + 1)) === radius
  // );
}

/**
 * Computes if a pixel at (x, y) is inside a brush at (brushX, brushY) with size brushSize.
 * @param {Number} x x-coordinate of pixel
 * @param {Number} y y-coordinate of pixel
 * @param {Number} brushX x-coordinate of brush center
 * @param {Number} brushY y-coordinate of brush center
 * @param {Number} brushSize size of brush
 * @returns {boolean} whether the pixel is inside the brush
 */
function insideBrush(x, y, brushX, brushY, brushSize) {
  const radius = brushSize - 1;
  return Math.floor(distance(x - brushX, y - brushY)) <= radius;
}

const BrushCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const brush = useBrush();
  const x = useSelector(brush, (state) => state.context.x);
  const y = useSelector(brush, (state) => state.context.y);
  const trace = useSelector(brush, (state) => state.context.trace);
  const size = useSelector(brush, (state) => state.context.brushSize);

  const select = useSelect();
  const background = useSelector(select, (state) => state.context.background);
  const color = background !== 0 ? red : white;

  const kernelRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    const gpu = new GPU({ canvas, gl });
    kernelRef.current = gpu
      .createKernel(function (trace, traceLength, size, color, brushX, brushY) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const [r, g, b, a] = color;
        const radius = size - 1;
        const distX = Math.abs(x - brushX);
        const distY = Math.abs(y - brushY);

        const onBrush =
          distance(distX, distY) === radius &&
          // not on border if next to border in both directions
          !(distance(distX + 1, distY) === radius && distance(distX, distY + 1) === radius);

        if (onBrush) {
          this.color(r / 255, g / 255, b / 255, a / 255);
        } else if (traceLength > 0) {
          for (let i = 0; i < traceLength; i++) {
            if (distance(trace[i][0] - x, trace[i][1] - y) <= radius) {
              this.color(r / 255, g / 255, b / 255, a / 255 / 2);
              break;
            }
          }
        }
      })
      .setConstants({ w: width, h: height })
      .setOutput([width, height])
      .setGraphical(true)
      .setDynamicArguments(true)
      .addFunction(distance);
  }, [width, height]);

  useEffect(() => {
    // edge case to deal with GPU.js error
    // passing [] as trace causes this error
    // gpu-browser.js:18662 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    // at Object.isArray (gpu-browser.js:18662:1)
    if (trace.length === 0) {
      kernelRef.current([[0, 0]], trace.length, size, color, x, y);
    } else {
      kernelRef.current(trace, trace.length, size, color, x, y);
    }
    setCanvases((canvases) => ({ ...canvases, tool: canvasRef.current }));
  }, [setCanvases, size, color, x, y, trace]);

  useEffect(
    () => () =>
      setCanvases((canvases) => {
        delete canvases['tool'];
        return { ...canvases };
      }),
    [setCanvases]
  );

  return <canvas id='brush-canvas' hidden={true} ref={canvasRef} />;
};

export default BrushCanvas;
