import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useChannel, useRaw } from '../../ProjectContext';

export const GrayscaleCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const scale = useSelector(canvas, (state) => state.context.scale);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const raw = useRaw();
  const grayscaleMode = useSelector(raw, (state) => state.context.grayscaleMode);
  const channelIndex = useSelector(grayscaleMode, (state) => state.context.channel);
  const channel = useChannel(channelIndex);

  const invert = useSelector(channel, (state) => state.context.invert);
  const [min, max] = useSelector(channel, (state) => state.context.range);
  const brightness = useSelector(channel, (state) => state.context.brightness);
  const contrast = useSelector(channel, (state) => state.context.contrast);
  const rawImage = useSelector(channel, (state) => state.context.rawImage);

  const canvasRef = useRef();
  const ctxRef = useRef();
  const hiddenCanvasRef = useRef();
  const hiddenCtxRef = useRef();

  useEffect(() => {
    ctxRef.current = canvasRef.current.getContext('2d');
    ctxRef.current.imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    hiddenCtxRef.current = hiddenCanvasRef.current.getContext('2d');
  }, [sw, sh]);

  const kernel = useRef();
  const gpuCanvasRef = useRef();
  const gpuCtxRef = useRef();
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
    gpuCanvasRef.current = kernel.current.canvas;
    console.log('gpuCanvasRef', gpuCanvasRef.current, width, height);
    gpuCtxRef.current = kernel.current.canvas.getContext('2d');
    console.log('gpuCtxRef', gpuCtxRef.current);
  }, [width, height]);

  useEffect(() => {
    // Draw image to access imageData
    // TODO: provide raw array directly
    hiddenCtxRef.current.drawImage(rawImage, 0, 0);
    const imageData = hiddenCtxRef.current.getImageData(0, 0, width, height);
    console.log('imageData', imageData);
    console.log(min, max, brightness, contrast, invert);
    kernel.current(imageData.data, min, max, brightness, contrast, invert);
  }, [rawImage, min, max, brightness, contrast, invert, width, height]);

  useEffect(() => {
    ctxRef.current.clearRect(0, 0, width, height);
    ctxRef.current.drawImage(
      gpuCanvasRef.current,
      sx,
      sy,
      sw / zoom,
      sh / zoom,
      0,
      0,
      width,
      height
    );
  }, [rawImage, min, max, brightness, contrast, invert, sx, sy, zoom, sw, sh, width, height]);

  return (
    <>
      {/* hidden processing canvas */}
      <canvas id='raw-processing' hidden={true} ref={hiddenCanvasRef} width={sw} height={sh} />
      <canvas id='raw-canvas' className={className} ref={canvasRef} width={width} height={height} />
    </>
  );
};

export default GrayscaleCanvas;
