import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { labelService, labelAdjustService } from '../statechart/service';

const highlightImageData = (data, label) => {
  for (let i = 0; i < data.length; i += 4) {
    // TODO: access label array
    const element = 'TODO';
    if ( element === label) {
      data[i] += 255; // red
      data[i + 1] -= 255; // green
      data[i + 2] -= 255; // blue
    }
  }
  return data;
};

const transparentBackgroundImageData = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
      data[i + 3] = 0;
    }
    // // TODO: access label array
    // const element = 'TODO';
    // if ( element === 0) {
    //   data[i] += 255; // red
    //   data[i + 1] -= 255; // green
    //   data[i + 2] -= 255; // blue
    // }
  }
  return data;

};

const opacityImageData = (data, opacity) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] *= opacity;
  }
  return data;
};

export const LabelCanvas = props => {
  const { zoom, ...rest } = props
  const [current, send] = useService(labelService);
  const [label, setLabel] = useState(new Image());
  const [sx, sy] = [0, 0];
  // const [sx, sy, zoom] = [0, 0, 1];
  const [width, height] = [160, 160];
  const [foreground, background] = [1, 2];


  const canvasRef = useRef();
  const ctx = useRef();

  const labelCanvas = new OffscreenCanvas(width, height);
  const labelCtx = labelCanvas.getContext('2d');


  const [currentAdjust, sendAdjust] = useService(labelAdjustService);
  const { highlight, transparentBackground, opacity } = currentAdjust.context;

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    labelCtx.drawImage(label, 0, 0);
    let data = labelCtx.getImageData(0, 0, width, height).data;
    if (highlight) {
      data = highlightImageData(data, foreground);
    }
    if (transparentBackground) {
      data = transparentBackgroundImageData(data);
    }
    data = opacityImageData(data, opacity);
    const adjustedData = new ImageData(data, width, height);
    labelCtx.putImageData(adjustedData, 0, 0);
  }, [label, foreground, highlight, transparentBackground, opacity, height, width, labelCtx]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      labelCanvas,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [labelCanvas, sx, sy, zoom, width, height, props.width, props.height]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios('http://0.0.0.0:5000/api/project/qUtuBnLdw5S-');
      const labelImage = new Image();
      labelImage.src = result.data.imgs.segmented;
      setLabel(labelImage);
    };
    fetchData();
  }, []);

  return <canvas id='label-canvas'
    ref={canvasRef}
    {...rest}
  />;
};

export default LabelCanvas;
