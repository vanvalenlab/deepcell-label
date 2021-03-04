import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { labelService } from '../statechart/service';


export const RawCanvas = props => { 
  const { zoom, ...rest } = props
  const [current, send] = useService(labelService);
  const [raw, setRaw] = useState(new Image());
  const [sx, sy] = [0, 0];
  // const [sx, sy, zoom] = [0, 0, 1];
  const [width, height] = [160, 160];


  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d')
    ctx.current.imageSmoothingEnabled = false;
  }, [props]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, props.width, props.height);
    ctx.current.drawImage(
      raw,
      sx, sy,
      width / zoom, height / zoom,
      0, 0,
      props.width, props.height,
    );
    ctx.current.restore();
  }, [raw, sx, sy, zoom, width, height, props.width, props.height]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios('http://0.0.0.0:5000/api/project/qUtuBnLdw5S-');
      const rawImage = new Image();
      rawImage.src = result.data.imgs.raw;
      setRaw(rawImage);
    };
 
    fetchData();
  }, []);

  return <canvas id='raw-canvas'
    ref={canvasRef}
    {...rest}
  />;
};

export default RawCanvas;
