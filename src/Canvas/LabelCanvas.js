import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { labelService } from '../statechart/service';


export const LabelCanvas = props => {
  const { zoom, ...rest } = props
  const [current, send] = useService(labelService);
  const [label, setLabel] = useState(new Image());
  const [sx, sy] = [0, 0];
  // const [sx, sy, zoom] = [0, 0, 1];
  const [width, height] = [160, 160];


  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.globalAlpha = 0.5;
    ctx.current.drawImage(
      label,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [label, sx, sy, zoom, width, height, props.width, props.height]);

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
