import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useImage, useRaw, useRawArray } from '../../ProjectContext';
import {
  adjustRangeImageData,
  brightnessImageData,
  contrastImageData,
  createImageData,
  invertImageData,
} from '../canvasUtils';

export const GrayscaleCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const scale = useSelector(canvas, state => state.context.scale);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const image = useImage();
  const frameId = useSelector(image, state => state.context.frame);

  const raw = useRaw();
  const channelId = useSelector(raw, state => state.context.channel);
  const channel = useSelector(raw, state => {
    const { channels, channel } = state.context;
    return channels[channel];
  });

  const invert = useSelector(channel, state => state.context.invert);
  const [min, max] = useSelector(channel, state => state.context.range);
  const brightness = useSelector(channel, state => state.context.brightness);
  const contrast = useSelector(channel, state => state.context.contrast);

  const array = useRawArray(channelId, frameId);

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

  useEffect(() => {
    // draw image onto canvas to get image data
    const ctx = hiddenCtxRef.current;
    const imageData = createImageData(array, sw, sh);
    // adjust image data
    adjustRangeImageData(imageData, min, max);
    brightnessImageData(imageData, brightness);
    contrastImageData(imageData, contrast);
    if (invert) {
      invertImageData(imageData);
    }
    // redraw with adjusted data
    ctx.putImageData(imageData, 0, 0);
  }, [array, min, max, invert, brightness, contrast, sw, sh]);

  useEffect(() => {
    const hiddenCanvas = hiddenCanvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(hiddenCanvas, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
  }, [array, min, max, invert, brightness, contrast, sx, sy, zoom, sw, sh, width, height]);

  return (
    <>
      {/* hidden processing canvas */}
      <canvas id='raw-processing' hidden={true} ref={hiddenCanvasRef} width={sw} height={sh} />
      {/* visible output canvas */}
      <canvas id='raw-canvas' className={className} ref={canvasRef} width={width} height={height} />
    </>
  );
};

export default GrayscaleCanvas;
