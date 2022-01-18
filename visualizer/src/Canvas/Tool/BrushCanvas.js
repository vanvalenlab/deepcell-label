import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useBrush,
  useCanvas,
  useDrawCanvas,
  useSelect,
} from '../../ProjectContext';

const red = [255, 0, 0, 255];
const white = [255, 255, 255, 255];

/**
 * Computes the distance of (x, y) from the origin (0, 0).
 * @param {Number} x
 * @param {Number} y
 * @returns {Number} distance in pixels from origin
 */
export function dist(x, y) {
  return Math.floor(Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2)));
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
  const kernelCanvasRef = useAlphaKernelCanvas();
  const drawCanvasRef = useDrawCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvasRef.current });
    const kernel = gpu.createKernel(
      function (trace, traceLength, size, color, brushX, brushY) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const [r, g, b, a] = color;
        const radius = size - 1;
        const distX = Math.abs(x - brushX);
        const distY = Math.abs(y - brushY);

        const onBrush =
          dist(distX, distY) === radius &&
          // not on border if next to border in both directions
          !(dist(distX + 1, distY) === radius && dist(distX, distY + 1) === radius);
        if (onBrush) {
          this.color(r / 255, g / 255, b / 255, a / 255);
          // needed to avoid minification that converts `if (x) { y }` to `x && y`
          for (let i = 0; i < 1; i++) {
            break;
          }
        } else if (traceLength > 0) {
          for (let i = 0; i < traceLength; i++) {
            if (dist(trace[i][0] - x, trace[i][1] - y) <= radius) {
              this.color(r / 255, g / 255, b / 255, a / 255 / 2);
              break;
            }
          }
        }
      },
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
        dynamicArguments: true,
        functions: [dist],
      }
    );
    kernelRef.current = kernel;
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [kernelCanvasRef, width, height]);

  useEffect(() => {
    // Draw the brush with the kernel
    // edge case to deal with GPU.js error
    // passing [] as trace causes this error
    // gpu-browser.js:18662 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    // at Object.isArray (gpu-browser.js:18662:1)
    if (trace.length === 0) {
      kernelRef.current([[0, 0]], trace.length, size, color, x, y);
    } else {
      kernelRef.current(trace, trace.length, size, color, x, y);
    }
    // Draw brush on a separate canvas (needed to reuse webgl output)\
    const drawCtx = drawCanvasRef.current.getContext('2d');
    drawCtx.clearRect(0, 0, width, height);
    drawCtx.drawImage(kernelCanvasRef.current, 0, 0);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, tool: drawCanvasRef.current }));
  }, [setCanvases, size, color, x, y, trace, kernelCanvasRef, drawCanvasRef, width, height]);

  useEffect(
    () => () =>
      setCanvases((canvases) => {
        delete canvases['tool'];
        return { ...canvases };
      }),
    [setCanvases]
  );

  return null;
};

export default BrushCanvas;
