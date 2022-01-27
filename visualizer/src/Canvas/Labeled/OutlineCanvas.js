import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useDrawCanvas,
  useImage,
  useLabeled,
  useSelect,
} from '../../ProjectContext';

const OutlineCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  const background = useSelector(select, (state) => state.context.background);

  const labeled = useLabeled();
  const outlineAll = useSelector(labeled, (state) => state.context.outline);
  const feature = useSelector(labeled, (state) => state.context.feature);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeledArrays && state.context.labeledArrays[feature][frame]
  );

  const kernelRef = useRef();
  const kernelCanvasRef = useAlphaKernelCanvas();
  const drawCanvasRef = useDrawCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvasRef.current });
    const kernel = gpu.createKernel(
      // template string needed to avoid minification breaking function
      // by changing if (x) { y } to x && y
      // TODO: research how to work around minification changes
      `function (data, outlineAll, foreground, background) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const label = data[y][x];
        const onOutline =
          label !== 0 &&
          ((x !== 0 && data[y][x - 1] !== label) ||
            (x !== this.constants.w - 1 && data[y][x + 1] !== label) ||
            (y !== 0 && data[y - 1][x] !== label) ||
            (y !== this.constants.h - 1 && data[y + 1][x] !== label));

        // always outline selected labels
        if (onOutline && label === background) {
          this.color(1, 0, 0, 1);
        } else if (onOutline && label === foreground) {
          this.color(1, 1, 1, 1);
        } else if (label === foreground && foreground !== 0) {
          this.color(1, 1, 1, 0.5);
        } else if (outlineAll && onOutline) {
          this.color(1, 1, 1, 1);
        }
      }`,
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
      }
    );
    kernelRef.current = kernel;
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [kernelCanvasRef, width, height]);

  useEffect(() => {
    // Compute the outline of the labels with the kernel
    kernelRef.current(labeledArray, outlineAll, foreground, background);
    // Draw kernel output on another canvas (needed to reuse webgl output)
    const drawCtx = drawCanvasRef.current.getContext('2d');
    drawCtx.clearRect(0, 0, width, height);
    drawCtx.drawImage(kernelCanvasRef.current, 0, 0);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, outline: drawCanvasRef.current }));
  }, [
    labeledArray,
    outlineAll,
    foreground,
    background,
    setCanvases,
    kernelCanvasRef,
    drawCanvasRef,
    width,
    height,
  ]);

  return null;
};

export default OutlineCanvas;
