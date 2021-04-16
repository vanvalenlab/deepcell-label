import React, { useEffect, useRef } from 'react';
import { useActor } from '@xstate/react';
import { useCanvas } from '../ServiceContext';

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

const removeNoLabelImageData = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    // TODO: access label array
    // if ( label === 0) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
      data[i + 3] = 0;
    }
  }
  return data;
};

const opacityImageData = (data, opacity) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] *= opacity;
  }
  return data;
};

export const LabeledCanvas = ({ feature, ...props }) => {

  const [currentFeature, sendFeature] = useActor(feature);
  const { highlight, showNoLabel, opacity, labeledImage } = currentFeature.context;
  const [foreground, background] = [1, 2];

  const canvas = useCanvas();
  const [currentCanvas, sendCanvas] = useActor(canvas);
  const { sx, sy, zoom, width, height } = currentCanvas.context;

  const canvasRef = useRef();
  const ctx = useRef();
  const labelCanvas = new OffscreenCanvas(width, height);
  const labelCtx = labelCanvas.getContext('2d');

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    labelCtx.drawImage(labeledImage, 0, 0);
    let data = labelCtx.getImageData(0, 0, width, height).data;
    if (highlight) {
      data = highlightImageData(data, foreground);
    }
    if (!showNoLabel) {
      data = removeNoLabelImageData(data);
    }
    data = opacityImageData(data, opacity);
    const adjustedData = new ImageData(data, width, height);
    labelCtx.putImageData(adjustedData, 0, 0);
  }, [labeledImage, foreground, highlight, showNoLabel, opacity, height, width, labelCtx]);

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

  return <canvas id='labeled-canvas'
    ref={canvasRef}
    {...props}
  />;
};

export default LabeledCanvas;
