import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useAlphaGpu, useCanvas, useWatershed } from '../../ProjectContext';

const crossColor = [255, 0, 255, 128];

const WatershedCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const watershed = useWatershed();
  const x1 = useSelector(watershed, (state) => state.context.x1);
  const y1 = useSelector(watershed, (state) => state.context.y1);
  const x2 = useSelector(watershed, (state) => state.context.x2);
  const y2 = useSelector(watershed, (state) => state.context.y2);
  const state = useSelector(watershed, (state) =>
    state.matches('clicked') ? 1 : state.matches('waiting') ? 2 : 0
  );

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      // TODO: research how to work around minification
      `function (x1, y1, x2, y2, color, state) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const [r, g, b, a] = color;

        if (state === 1 || state == 2) {
          if (y === y1 && (x === x1 - 1 || x === x1 || x === x1 + 1)) {
            this.color(r / 255, g / 255, b / 255, a / 255);
          }
          if (x === x1 && (y === y1 - 1 || y === y1 || y === y1 + 1)) {
            this.color(r / 255, g / 255, b / 255, a / 255);
          }
        }

        if (state === 2) {
          if (y === y2 && (x === x2 - 1 || x === x2 || x === x2 + 1)) {
            this.color(r / 255, g / 255, b / 255, a / 255);
          }
          if (x === x2 && (y === y2 - 1 || y === y2 || y === y2 + 1)) {
            this.color(r / 255, g / 255, b / 255, a / 255);
          }
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
    // Draw the watershed crosses with the kernel
    kernel(x1, y1, x2, y2, crossColor, state);
    // Rerender the parent canvas
    createImageBitmap(kernel.canvas).then((bitmap) => {
      setBitmaps((bitmaps) => ({ ...bitmaps, tool: bitmap }));
    });
  }, [setBitmaps, x1, y1, x2, y2, width, height, state]);

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

export default WatershedCanvas;
