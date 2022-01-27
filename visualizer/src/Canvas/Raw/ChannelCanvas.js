import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useArrays, useCanvas, useImage } from '../../ProjectContext';

/** Converts a hex string like #FF0000 to three element array for the RGB values. */
const hexToRGB = (hex) => {
  const r = parseInt('0x' + hex[1] + hex[2]);
  const g = parseInt('0x' + hex[3] + hex[4]);
  const b = parseInt('0x' + hex[5] + hex[6]);
  return [r, g, b];
};

export const ChannelCanvas = ({ layer, setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const layerIndex = useSelector(layer, (state) => state.context.layer);
  const color = useSelector(layer, (state) => state.context.color);
  const [min, max] = useSelector(layer, (state) => state.context.range);
  const on = useSelector(layer, (state) => state.context.on);
  const channel = useSelector(layer, (state) => state.context.channel);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const rawArray = useSelector(
    arrays,
    (state) => state.context.rawArrays && state.context.rawArrays[channel][frame]
  );

  const kernelRef = useRef();
  const canvasRef = useRef();
  useEffect(() => {
    const gpu = new GPU();
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
    canvasRef.current = kernel.canvas;
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [width, height]);

  useEffect(() => {
    // Rerender the canvas for this component
    kernelRef.current(rawArray, on, hexToRGB(color), min, max);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, [layerIndex]: canvasRef.current }));
  }, [rawArray, on, color, min, max, width, height, layerIndex, setCanvases]);

  // Remove canvas from canvases when layer is removed
  useEffect(() => {
    return () =>
      setCanvases((prevCanvases) => {
        delete prevCanvases[layerIndex];
        return { ...prevCanvases };
      });
  }, [setCanvases, layerIndex]);

  return null;
};

export default ChannelCanvas;
