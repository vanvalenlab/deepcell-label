import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef, useState } from 'react';
import { useArrays, useCanvas, useChannel, useImage, useRaw } from '../../ProjectContext';

export const GrayscaleCanvas = ({ setCanvases }) => {
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
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const rawArray = useSelector(
    arrays,
    (state) => state.context.raw && state.context.raw[channelIndex][frame]
  );

  const kernelRef = useRef();
  const [kernelCanvas] = useState(document.createElement('canvas'));

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (data, min, max, brightness, contrast, invert) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        // Rescale value from min - max to 0 - 1
        let v = Math.max(0, data[y][x] - min) / 255;
        const diff = (max - min) / 255;
        const scale = diff === 0 ? 1 : 1 / diff;
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
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [kernelCanvas, width, height]);

  useEffect(() => {
    // Rerender the canvas for this component
    if (rawArray) {
      kernelRef.current(rawArray, min, max, brightness, contrast, invert);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, raw: kernelCanvas }));
    }
  }, [kernelCanvas, rawArray, min, max, brightness, contrast, invert, setCanvases]);

  return null;
};

export default GrayscaleCanvas;
