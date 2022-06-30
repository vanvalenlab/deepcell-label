import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import { useArrays, useCanvas, useGpu, useImage } from '../../ProjectContext';

/** Converts a hex string like #FF0000 to three element array for the RGB values. */
const hexToRGB = (hex) => {
  const r = parseInt('0x' + hex[1] + hex[2]);
  const g = parseInt('0x' + hex[3] + hex[4]);
  const b = parseInt('0x' + hex[5] + hex[6]);
  return [r, g, b];
};

export const ChannelCanvas = ({ layer, setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const layerIndex = useSelector(layer, (state) => state.context.layer);
  const color = useSelector(layer, (state) => state.context.color);
  const [min, max] = useSelector(layer, (state) => state.context.range);
  const on = useSelector(layer, (state) => state.context.on);
  const channel = useSelector(layer, (state) => state.context.channel);

  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);

  const arrays = useArrays();
  const raw = useSelector(arrays, (state) => state.context.raw && state.context.raw[channel][t]);

  const kernelRef = useRef();
  const gpu = useGpu();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, on, color, min, max) {
        if (on) {
          const x = this.thread.x;
          const y = this.constants.h - 1 - this.thread.y;
          const v = (data[y][x] - min) / 255;
          const diff = max - min;
          const scale = diff === 0 ? 1 : 1 / diff;
          const [r, g, b] = color;
          this.color(r * v * scale, g * v * scale, b * v * scale, 1);
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
    if (raw) {
      const kernel = kernelRef.current;
      // Rerender the canvas for this component
      kernel(raw, on, hexToRGB(color), min, max);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, [layerIndex]: bitmap }));
      });
    }
  }, [raw, on, color, min, max, width, height, layerIndex, setBitmaps]);

  // Remove bitmap when layer is removed
  useEffect(() => {
    return () =>
      setBitmaps((bitmaps) => {
        const { [layerIndex]: removed, ...rest } = bitmaps;
        return rest;
      });
  }, [setBitmaps, layerIndex]);

  return null;
};

export default ChannelCanvas;
