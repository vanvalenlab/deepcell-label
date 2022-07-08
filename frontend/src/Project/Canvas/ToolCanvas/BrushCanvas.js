import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useAlphaGpu, useBrush, useCanvas } from '../../ProjectContext';

const red = [255, 0, 0, 255];
const white = [255, 255, 255, 255];

const BrushCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const brush = useBrush();
  const x = useSelector(brush, (state) => state.context.x);
  const y = useSelector(brush, (state) => state.context.y);
  const trace = useSelector(brush, (state) => state.context.trace);
  const size = useSelector(brush, (state) => state.context.brushSize);
  const erase = useSelector(brush, (state) => state.context.erase);
  const color = erase ? red : white;

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      // TODO: research how to work around minification
      `function (trace, traceLength, size, brushX, brushY, color) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const radius = size - 1;
        const distX = Math.abs(x - brushX);
        const distY = Math.abs(y - brushY);
        const [r, g, b, a] = color

        function dist(x, y) {
          return Math.floor(Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2)));
        }

        const onBrush =
          dist(distX, distY) === radius &&
          // not on border if next to border in both directions
          !(dist(distX + 1, distY) === radius && dist(distX, distY + 1) === radius);
        if (onBrush) {
          this.color(r / 255, g / 255, b / 255, a / 255);
        } else if (traceLength > 0) {
          for (let i = 0; i < traceLength; i++) {
            if (dist(trace[i][0] - x, trace[i][1] - y) <= radius) {
              this.color(r / 255, g / 255, b / 255, a / 255 / 2);
              break;
            }
          }
        }
      }`,
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
        dynamicArguments: true,
      }
    );
    kernelRef.current = kernel;
  }, [gpu, width, height]);

  useEffect(() => {
    // Draw the brush with the kernel
    // edge case to deal with GPU.js error
    // passing [] as trace causes this error
    // gpu-browser.js:18662 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    // at Object.isArray (gpu-browser.js:18662:1)
    const kernel = kernelRef.current;
    if (trace.length === 0) {
      kernel([[0, 0]], trace.length, size, x, y, color);
    } else {
      kernel(trace, trace.length, size, x, y, color);
    }
    // Rerender the parent canvas
    createImageBitmap(kernel.canvas).then((bitmap) => {
      setBitmaps((bitmaps) => ({ ...bitmaps, tool: bitmap }));
    });
  }, [trace, size, x, y, color, setBitmaps]);

  useEffect(
    () => () =>
      setBitmaps((bitmaps) => {
        const { tool, ...rest } = bitmaps;
        return rest;
      }),
    [setBitmaps]
  );

  return null;
};

export default BrushCanvas;
