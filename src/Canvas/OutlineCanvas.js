import React, { useState, useEffect, useRef } from 'react';
import { useActor } from '@xstate/react';
import { useCanvas, useTool } from '../ServiceContext';

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

const OutlineCanvas = ({ feature, sx, sy, sw, sh, zoom, ...props }) => {

  const tool = useTool();
  const [currentTool, sendTool] = useActor(tool);
  const { foreground, background } = currentTool.context;

  const [currentFeature, sendFeature] = useActor(feature);
  let { labeledArray, outline } = currentFeature.context;
  if (!labeledArray) { labeledArray = Array(sh).fill(Array(sw).fill(0)); }

  const canvasRef = useRef();
  const ctx = useRef();
  // to convert the outline array into an image
  const outlineCanvas = new OffscreenCanvas(sw, sh);
  const outlineCtx = outlineCanvas.getContext('2d');

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

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
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      outlineCanvas,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [outlineCanvas, sx, sy, zoom, sw, sh, props.width, props.height]);

  return <canvas id='outline-canvas'
    ref={canvasRef}
    {...props}
  />;
};

export default OutlineCanvas;