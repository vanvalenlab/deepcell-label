import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useChannel, useRaw } from '../../ProjectContext';

export const GrayscaleCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const raw = useRaw();
  const grayscaleMode = useSelector(raw, (state) => state.context.grayscaleMode);
  const channelIndex = useSelector(grayscaleMode, (state) => state.context.channel);
  const channel = useChannel(channelIndex);
  const invert = useSelector(channel, (state) => state.context.invert);
  const [min, max] = useSelector(channel, (state) => state.context.range);
  const brightness = useSelector(channel, (state) => state.context.brightness);
  const contrast = useSelector(channel, (state) => state.context.contrast);
  let imageData = useSelector(channel, (state) => state.context.imageData);
  if (imageData === null) {
    imageData = new ImageData(width, height);
  }

  const kernel = useRef();
  const canvasRef = useRef();
  useEffect(() => {
    const gpu = new GPU();
    kernel.current = gpu
      .createKernel(function (data, min, max, brightness, contrast, invert) {
        const n = 4 * (this.thread.x + this.constants.w * (this.constants.h - this.thread.y));
        // Rescale value from min - max to 0 - 1
        let v = Math.max(0, data[n] - min) / 255;
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
      })
      .setConstants({ w: width, h: height })
      .setOutput([width, height])
      .setGraphical(true);
    canvasRef.current = kernel.current.canvas;
  }, [width, height]);

  useEffect(() => {
    // Rerender the canvas for this component
    kernel.current(imageData.data, min, max, brightness, contrast, invert);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, raw: canvasRef.current }));
  }, [imageData, min, max, brightness, contrast, invert, width, height, setCanvases]);

  return null;
};

export default GrayscaleCanvas;
