import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useChannel,
  useImage,
  useLabeled,
  useRaw,
} from '../ProjectContext';

const OutlineCanvasNoOverlap = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.outlineOpacity);
  const feature = useSelector(labeled, (state) => state.context.feature);

  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);
  const channelIndex = useSelector(raw, (state) => state.context.channel);
  const channel = useChannel(channelIndex);
  const invert = useSelector(channel, (state) => state.context.invert && isGrayscale);

  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeled && state.context.labeled[feature][t]
  );

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, opacity, invert) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        let north = value;
        let south = value;
        let east = value;
        let west = value;
        if (x !== 0) {
          north = data[y][x - 1];
        }
        if (x !== this.constants.w - 1) {
          south = data[y][x + 1];
        }
        if (y !== 0) {
          west = data[y - 1][x];
        }
        if (y !== this.constants.h - 1) {
          east = data[y + 1][x];
        }
        let outlineOpacity = 1;

        if (north !== value || south !== value || east !== value || west !== value) {
          if (value > 0) {
            outlineOpacity = 1 - opacity;
          }
        }
        let [r, g, b] = [1, 1, 1];
        if (invert) {
          r = 0;
          r = 0;
          b = 0;
        }
        this.color(r, g, b, 1 - outlineOpacity)
      }`,
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
        dynamicArguments: true,
        loopMaxIterations: 5000, // Maximum number of outlines to render
      }
    );
    kernelRef.current = kernel;
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    if (labeledArray) {
      // Compute the outline of the labels with the kernel
      kernel(labeledArray, opacity, invert);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, outline: bitmap }));
      });
    }
  }, [labeledArray, opacity, invert, setBitmaps, width, height]);

  return null;
};

export default OutlineCanvasNoOverlap;
