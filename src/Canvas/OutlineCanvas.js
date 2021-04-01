import React, { useState, useEffect, useRef } from 'react';
import { useActor } from '@xstate/react';
import { useCanvas, useLabeled, useTool } from '../ServiceContext';

const OutlineCanvas = props => {
  // const [foreground, background] = [1, 2];
  const [all, setAll] = useState(false);

  const [currentCanvas, sendCanvas] = useCanvas();
  const { sx, sy, zoom, width, height } = currentCanvas.context;

  const [currentLabeled, sendLabeled] = useLabeled();
  const [currentFeature, sendFeature] = useActor(currentLabeled.context.featureActor);
  const { labeledArray } = currentFeature.context;

  const [currentEditor, sendEditor] = useTool();
  const { foreground, background } = currentEditor.context;


  const canvasRef = useRef();
  const ctx = useRef();
  // to convert the outline array into an image
  const outlineCanvas = new OffscreenCanvas(width, height);
  const outlineCtx = outlineCanvas.getContext('2d');

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    const width = labeledArray[0].length;
    const height = labeledArray.length;
    if (width * height === 0) { return; }
    const array = new Uint8ClampedArray(width * height * 4);
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < height; j += 1) { // y
      for (let i = 0; i < width; i += 1) { // x
        const label = labeledArray[j][i];
        if (foreground !== 0 && label === -1 * foreground) {
          array[(j * width  + i) * 4 + 0] = 255;
          array[(j * width  + i) * 4 + 1] = 255;
          array[(j * width  + i) * 4 + 2] = 255;
          array[(j * width  + i) * 4 + 3] = 255;
        } else if (background !== 0 && label === -1 * background) {
          array[(j * width  + i) * 4 + 0] = 255;
          array[(j * width  + i) * 4 + 1] = 0;
          array[(j * width  + i) * 4 + 2] = 0;
          array[(j * width  + i) * 4 + 3] = 255;
        }
      }
    }
    const data = new ImageData(array, width, height);
    outlineCtx.putImageData(data, 0, 0);
  }, [labeledArray, foreground, background, outlineCtx]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      outlineCanvas,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [outlineCanvas, sx, sy, zoom, width, height, props.width, props.height]);

  return <canvas id='outline-canvas'
    ref={canvasRef}
    {...props}
  />;
};

export default OutlineCanvas;