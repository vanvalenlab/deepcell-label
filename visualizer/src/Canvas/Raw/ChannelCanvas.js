import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useChannel } from '../../ProjectContext';

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
  const channelIndex = useSelector(layer, (state) => state.context.channel);
  const channel = useChannel(channelIndex);
  let imageData = useSelector(channel, (state) => state.context.imageData);
  if (imageData === null) {
    imageData = new ImageData(width, height);
  }

  const canvasRef = useRef();
  const ctxRef = useRef();
  useEffect(() => {
    ctxRef.current = canvasRef.current.getContext('2d');
  }, []);

  const kernel = useRef();
  const gpuCanvasRef = useRef();
  useEffect(() => {
    const gpu = new GPU();
    kernel.current = gpu
      .createKernel(function (data, on, color, min, max) {
        if (on) {
          // TODO: Remove 4 after switching from imageData to raw array
          const n = 4 * (this.thread.x + this.constants.w * (this.constants.h - this.thread.y));
          const v = (data[n] - min) / 255;
          const diff = max - min;
          const scale = diff === 0 ? 1 : 1 / diff;
          const [r, g, b] = color;
          this.color(r * v * scale, g * v * scale, b * v * scale, 1);
        } else {
          this.color(0, 0, 0, 0);
        }
      })
      .setConstants({ w: width, h: height })
      .setOutput([width, height])
      .setGraphical(true);
    gpuCanvasRef.current = kernel.current.canvas;
  }, [width, height]);

  useEffect(() => {
    // Draw image to access imageData
    // TODO: provide raw array directly
    kernel.current(imageData.data, on, hexToRGB(color), min, max);
    // Reassign canvas to trigger rerender
    setCanvases((canvases) => ({ ...canvases, [layerIndex]: gpuCanvasRef.current }));
  }, [imageData, on, color, min, max, width, height, layerIndex, setCanvases]);

  // Clean up canvas
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
