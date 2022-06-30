import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useArrays, useCanvas, useChannel, useGpu, useImage, useRaw } from '../../ProjectContext';

export const GrayscaleCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const raw = useRaw();
  const channelIndex = useSelector(raw, (state) => state.context.channel);
  const channel = useChannel(channelIndex);
  const invert = useSelector(channel, (state) => state.context.invert);
  const [min, max] = useSelector(channel, (state) => state.context.range);
  const brightness = useSelector(channel, (state) => state.context.brightness);
  const contrast = useSelector(channel, (state) => state.context.contrast);

  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);

  const arrays = useArrays();
  const rawArray = useSelector(
    arrays,
    (state) => state.context.raw && state.context.raw[channelIndex][t]
  );

  const kernelRef = useRef();
  const gpu = useGpu();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, min, max, brightness, contrast, invert) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        // Rescale value from min - max to 0 - 1
        let v = Math.max(0, data[y][x] - min) / 255;
        const diff = (max - min) / 255;
        const scale = diff === 0 ? 255 : 1 / diff;
        v = Math.min(1, v * scale);
        // Shift by brightness
        v = Math.max(0, Math.min(1, v + brightness));
        // Apply contrast
        const contrastFactor = (1 + contrast) / (1.001 - contrast);
        v = Math.max(0, Math.min(1, contrastFactor * (v - 0.5) + 0.5));
        // Invert
        if (invert) {
          v = 1 - v;
        }
        this.color(v, v, v, 1);
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
    // Rerender the canvas for this component
    if (rawArray) {
      const kernel = kernelRef.current;
      kernel(rawArray, min, max, brightness, contrast, invert);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, raw: bitmap }));
      });
    }
  }, [rawArray, min, max, brightness, contrast, invert, setBitmaps, height, width]);

  return null;
};

export default GrayscaleCanvas;
