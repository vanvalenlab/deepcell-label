import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useTool } from '../ServiceContext';

function outlineSelected(imageData, labeledArray, foreground, background) {
  const { data, width, height } = imageData;
  // use label array to figure out which pixels to recolor
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      const label = labeledArray[j][i];
      if (foreground !== 0 && label === -1 * foreground) {
        data[(j * width  + i) * 4 + 0] = 255;
        data[(j * width  + i) * 4 + 1] = 255;
        data[(j * width  + i) * 4 + 2] = 255;
        data[(j * width  + i) * 4 + 3] = 255;
      } else if (background !== 0 && label === -1 * background) {
        data[(j * width  + i) * 4 + 0] = 255;
        data[(j * width  + i) * 4 + 1] = 0;
        data[(j * width  + i) * 4 + 2] = 0;
        data[(j * width  + i) * 4 + 3] = 255;
      }
    }
  }
}

function outlineAll(imageData, labeledArray) {
  const { data, width, height } = imageData;
  // use label array to figure out which pixels to recolor
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      const label = labeledArray[j][i];
      if (label < 0) {
        data[(j * width  + i) * 4 + 0] = 255;
        data[(j * width  + i) * 4 + 1] = 255;
        data[(j * width  + i) * 4 + 2] = 255;
        data[(j * width  + i) * 4 + 3] = 255;
      }
    }
  }
}

const OutlineCanvas = ({ feature, sx, sy, sw, sh, zoom, width, height, className }) => {

  const tool = useTool();
  const foreground = useSelector(tool, state => state.context.foreground);
  const background = useSelector(tool, state => state.context.background);

  const outline = useSelector(feature, state => state.context.outline);
  let labeledArray = useSelector(feature, state => state.context.labeledArray);
  if (!labeledArray) { labeledArray = Array(sh).fill(Array(sw).fill(0)); }

  const canvasRef = useRef();
  const ctx = useRef();
  // to convert the outline array into an image
  const outlineCanvas = new OffscreenCanvas(sw, sh);
  const outlineCtx = outlineCanvas.getContext('2d');

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [width, height]);

  useEffect(() => {
    const width = labeledArray[0].length;
    const height = labeledArray.length;
    const data = new ImageData(width, height);
    switch (outline) {
      case 'all':
        outlineAll(data, labeledArray);
      case 'selected':
        outlineSelected(data, labeledArray, foreground, background);
      case 'none':
      default:
    }
    outlineCtx.putImageData(data, 0, 0);
  }, [labeledArray, foreground, background, outlineCtx]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(
      outlineCanvas,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
    ctx.current.restore();
  }, [outlineCanvas, sx, sy, zoom, sw, sh, width, height]);

  return <canvas id='outline-canvas'
    ref={canvasRef}
    width={width}
    height={height}
    className={className}
  />;
};

export default React.memo(OutlineCanvas);