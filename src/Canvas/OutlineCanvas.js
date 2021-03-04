import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { labelService } from '../statechart/service';

const OutlineCanvas = props => {
  const { zoom, ...rest } = props;
  const [current, send] = useService(labelService);
  const [labelArray, setLabelArray] = useState([[0]]);
  const [sx, sy] = [0, 0];
  // const [sx, sy, zoom] = [0, 0, 1];
  const [width, height] = [160, 160];
  const [foreground, background] = [1, 2];
  const [all, setAll] = useState(false);


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
    const fetchData = async () => {
      const result = await axios('http://0.0.0.0:5000/api/project/qUtuBnLdw5S-');
      setLabelArray(result.data.imgs.seg_arr);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const width = labelArray[0].length;
    const height = labelArray.length;
    const array = new Uint8ClampedArray(width * height * 4);
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < height; j += 1) { // y
      for (let i = 0; i < width; i += 1) { // x
        const label = labelArray[j][i];
        if (label === -1 * foreground) {
          array[(j * width  + i) * 4 + 0] = 255;
          array[(j * width  + i) * 4 + 1] = 255;
          array[(j * width  + i) * 4 + 2] = 255;
          array[(j * width  + i) * 4 + 3] = 255;
        } else if (label === -1 * background) {
          array[(j * width  + i) * 4 + 0] = 255;
          array[(j * width  + i) * 4 + 1] = 0;
          array[(j * width  + i) * 4 + 2] = 0;
          array[(j * width  + i) * 4 + 3] = 255;
        }
      }
    }
    const data = new ImageData(array, width, height);
    outlineCtx.putImageData(data, 0, 0);
  }, [labelArray, foreground, background, outlineCtx]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.globalAlpha = 0.5;
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
    {...rest}
  />;
};

export default OutlineCanvas;