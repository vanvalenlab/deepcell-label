import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useImage, useRawArray } from '../../ProjectContext';
import { adjustRangeImageData, createImageData, recolorImageData } from '../canvasUtils';

/** Converts a hex string like #FF0000 to three element array for the RGB values. */
const hexToRGB = hex => {
  const r = parseInt('0x' + hex[1] + hex[2]);
  const g = parseInt('0x' + hex[3] + hex[4]);
  const b = parseInt('0x' + hex[5] + hex[6]);
  return [r, g, b];
};

const ChannelCanvas = ({ layer, setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, state => state.context.width);
  const height = useSelector(canvas, state => state.context.height);

  const canvasRef = useRef();
  const ctxRef = useRef();

  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);

  const layerIndex = useSelector(layer, state => state.context.layer);
  const channel = useSelector(layer, state => state.context.channel);
  const color = useSelector(layer, state => state.context.color);
  const [min, max] = useSelector(layer, state => state.context.range);
  const on = useSelector(layer, state => state.context.on);

  const array = useRawArray(channel, frame);

  useEffect(() => {
    const channelCanvas = canvasRef.current;
    ctxRef.current = channelCanvas.getContext('2d');
  }, []);

  useEffect(() => {
    // draw image onto canvas to get image data
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (on) {
      const imageData = createImageData(array, width, height);
      adjustRangeImageData(imageData, min, max);
      recolorImageData(imageData, hexToRGB(color));
      // redraw with adjusted data
      ctx.putImageData(imageData, 0, 0);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    // assign to channelCanvases to rerender
    setCanvases(prevCanvases => ({ ...prevCanvases, [layerIndex]: canvas }));
  }, [canvasRef, setCanvases, on, layerIndex, array, color, min, max, width, height]);

  useEffect(() => {
    return () =>
      setCanvases(prevCanvases => {
        delete prevCanvases[layerIndex];
        return { ...prevCanvases };
      });
  }, [setCanvases, layerIndex]);

  return (
    <canvas
      id={`layer${layerIndex}-processing`}
      hidden={true}
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
};

export default ChannelCanvas;
