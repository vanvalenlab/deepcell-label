import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import React, { useEffect, useRef } from 'react';
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
  const rawImage = useSelector(channel, (state) => state.context.rawImage);

  const hiddenCanvasRef = useRef();
  const hiddenCtxRef = useRef();

  useEffect(() => {
    hiddenCtxRef.current = hiddenCanvasRef.current.getContext('2d');
  }, [width, height]);

  const kernel = useRef();
  const canvasRef = useRef();
  useEffect(() => {
    const gpu = new GPU();
    kernel.current = gpu
      .createKernel(function (data, min, max, brightness, contrast, invert) {
        // TODO: Remove 4 after switching from imageData to raw array
        const n = 4 * (this.thread.x + this.constants.w * (this.constants.h - this.thread.y));
        // rescale
        let v = Math.max(0, data[n] - min) / 255;
        const diff = (max - min) / 255;
        const scale = diff === 0 ? 1 : 1 / diff;
        v = Math.min(1, v * scale);
        // multiply by contrast factor
        v = Math.max(0, Math.min(1, (v * (1 + contrast)) / (1.001 - contrast)));
        // add brightness
        v = Math.max(0, Math.min(1, v + brightness));
        // invert
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
    // Draw image to access imageData
    // TODO: provide raw array directly
    hiddenCtxRef.current.drawImage(rawImage, 0, 0);
    const imageData = hiddenCtxRef.current.getImageData(0, 0, width, height);
    kernel.current(imageData.data, min, max, brightness, contrast, invert);
    setCanvases((canvases) => ({ ...canvases, raw: canvasRef.current }));
  }, [rawImage, min, max, brightness, contrast, invert, width, height, setCanvases]);

  return (
    <canvas id='raw-processing' hidden={true} ref={hiddenCanvasRef} width={width} height={height} />
  );
};

export default GrayscaleCanvas;
