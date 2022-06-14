import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useAlphaGpu, useCanvas, useThreshold } from '../../ProjectContext';

const ThresholdCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const threshold = useThreshold();
  const x1 = useSelector(threshold, (state) => state.context.x);
  const y1 = useSelector(threshold, (state) => state.context.y);
  const [x2, y2] = useSelector(threshold, (state) => state.context.firstPoint);
  const show = useSelector(threshold, (state) => state.matches('dragging'));

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (x1, y1, x2, y2) {
        const x = this.thread.x;
        const y = this.constants.h - this.thread.y;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if ((x === minX || x === maxX) && minY <= y && y <= maxY) {
          this.color(1, 1, 1, 1);
        } else if ((y === minY || y === maxY) && minX <= x && x <= maxX) {
          this.color(1, 1, 1, 1);
        } else if (minX <= x && x <= maxX && minY <= y && y <= maxY) {
          this.color(1, 1, 1, 0.5);
        } else {
          this.color(0, 0, 0, 0);
        }
      }`,
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
      }
    );
    kernelRef.current = kernel;
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    if (show) {
      // Compute threshold box with the kernel
      kernel(x1, y1, x2, y2);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, tool: bitmap }));
      });
    } else {
      // Remove this component's canvas from the parent canvas
      setBitmaps((bitmaps) => {
        const { tool, ...rest } = bitmaps;
        return rest;
      });
    }
  }, [setBitmaps, show, x1, y1, x2, y2]);

  return null;
};

export default ThresholdCanvas;
