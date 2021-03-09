import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { labelService, rawAdjustService, canvasService } from '../statechart/service';


const invertImageData = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]; // red
    data[i + 1] = 255 - data[i + 1]; // green
    data[i + 2] = 255 - data[i + 2]; // blue
  }
  return data;
}

const grayscaleImageData = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg; // red
    data[i + 1] = avg; // green
    data[i + 2] = avg; // blue
  }
  return data;
}

// contrast between 0 and 1
const contrastImageData = (data, contrast) => {
  contrast *= 255;  // scale fraction to full range of pixel values
  const factor = (255 + contrast) / (255.01 - contrast);  //add .1 to avoid /0 error
  for (let i = 0; i < data.length; i += 4) { //pixel values in 4-byte blocks (r,g,b,a)
    data[i] = factor * (data[i] - 128) + 128;     //r value
    data[i+1] = factor * (data[i+1] - 128) + 128; //g value
    data[i+2] = factor * (data[i+2] - 128) + 128; //b value
  }
  return data;
}

// brightness between -1 and 1
const brightnessImageData = (data, brightness) => {
  brightness *= 255;  // scale fraction to full range of pixel values
  for (let i = 0; i < data.length; i += 4) {  //pixel values in 4-byte blocks (r,g,b,a)
    data[i] = data[i] + brightness;     //r value
    data[i+1] = data[i+1] + brightness; //g value
    data[i+2] = data[i+2] + brightness; //b value
  }
  return data;
}

export const RawCanvas = props => { 
  const [current, send] = useService(labelService);
  const [raw, setRaw] = useState(new Image());

  const [currentAdjust, sendAdjust] = useService(rawAdjustService);
  const { invert, grayscale, brightness, contrast } = currentAdjust.context;

  const [currentCanvas, sendCanvas] = useService(canvasService);
  const { sx, sy, zoom, width, height } = currentCanvas.context;

  const canvasRef = useRef();
  const ctx = useRef();

  const rawCanvas = new OffscreenCanvas(width, height);
  const rawCtx = rawCanvas.getContext('2d');


  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d')
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    rawCtx.drawImage(raw, 0, 0);
    let data = rawCtx.getImageData(0, 0, width, height).data;
    if (invert) {
      data = invertImageData(data);
    }
    if (grayscale) {
      data = grayscaleImageData(data);
    }
    data = contrastImageData(data, contrast);
    data = brightnessImageData(data, brightness);
    const adjustedData = new ImageData(data, width, height);
    rawCtx.putImageData(adjustedData, 0, 0);
  }, [raw, invert, grayscale, brightness, contrast, height, width, rawCtx]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      rawCanvas,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [rawCanvas, sx, sy, zoom, width, height, props.width, props.height]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios('http://0.0.0.0:5000/api/project/Df3GUkjcppjd');
      const rawImage = new Image();
      rawImage.src = result.data.imgs.raw;
      setRaw(rawImage);
    };
 
    fetchData();
  }, []);

  return <canvas id='raw-canvas'
    ref={canvasRef}
    {...props}
  />;
};

export default RawCanvas;
