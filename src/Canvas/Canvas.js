import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import useCanvas from '../useCanvas';
import { labelService } from '../statechart/service';


const useStyles = makeStyles(() => {
  const [current, send] = useService(labelService);
  // const { sx, sy, sWidth, sHeight, width, height } = current.context;
  const [sx, sy, sWidth, sHeight, width, height] = [0, 0, 4* 160, 4* 160, 4 * 160, 4 * 160];

  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = 'green'; // (Math.ceil(sy + sHeight) === height) ? 'white' : 'black';
  const rightColor = 'red'; //(Math.ceil(sx + sWidth) === width) ? 'white' : 'black';
  const leftColor = (Math.floor(sx) === 0) ? 'white' : 'black';

  return {
    canvas: {
      boxSizing: 'border-box',
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
      position: 'absolute',
      top: 0,
      left: 0,
      // height: 4 * 160,
      // width: 4 * 160,
      imageRendering: 'pixelated',
      objectFit: 'contain',
      maxHeight: '100%',
      // maxWidth: '100%',
      // height: '100%',
      width: '100%',
      objectPosition: 'top left',
      // imageRendering: '-moz-crisp-edges',
      // imageRendering: 'crisp-edges',
      // imageRendering: 'optimizeSpeed',             // Older versions of FF
      // imageRendering: '-moz-crisp-edges',          // FF 6.0+
      // imageRendering: '-webkit-optimize-contrast', // Webkit (non standard naming)
      // imageRendering: '-o-crisp-edges',            // OS X & Windows Opera (12.02+)
      // imageRendering: 'crisp-edges',               // Possible future browsers.
      // msInterpolationMode: 'nearest-neighbor',
    },
    empty: {
      boxSizing: 'border-box',
      objectFit: 'contain',
      maxHeight: '100%',
      // maxWidth: '100%',
      // height: '100%',
      width: '100%',
      objectPosition: 'top left',
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
    },
  };
});

export const EmptyCanvas = props => {
  const styles = useStyles();
  const [width, height] = [160, 160];

  return <canvas id='canvas'
    className={styles.empty}
    width={width}
    height={height}
    {...props}
  />;
}

export const RawCanvas = props => { 
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [raw, setRaw] = useState(new Image());
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 160, 160];
  const [width, height] = [160, 160];


  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d')
  }, []);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, ctx.current.canvas.width, ctx.current.canvas.height);
    ctx.current.drawImage(
      raw,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      ctx.current.canvas.width,
      ctx.current.canvas.height
    );
    ctx.current.restore();
  }, [raw, sx, sy, sWidth, sHeight]);

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
    className={styles.canvas}
    ref={canvasRef}
    width={width}
    height={height}
    {...props}
  />;
};

export const LabelCanvas = props => { 
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [label, setLabel] = useState(new Image());
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 160, 160];
  const [width, height] = [160, 160];


  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d')
  }, []);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, ctx.current.canvas.width, ctx.current.canvas.height);
    ctx.current.globalAlpha = 0.5;
    ctx.current.drawImage(
      label,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      ctx.current.canvas.width,
      ctx.current.canvas.height
    );
    ctx.current.restore();
  }, [label, sx, sy, sWidth, sHeight]);

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
    className={styles.canvas}
    ref={canvasRef}
    width={width}
    height={height}
    {...props}
  />;
};

export const OutlineCanvas = props => {
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [labelArray, setLabelArray] = useState([[0]]);
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 160, 160];
  const [width, height] = [160, 160];
  const [foreground, background] = [1, 2];
  const [all, setAll] = useState(false);


  const canvasRef = useRef();
  const ctx = useRef();

  const outlineCanvas = new OffscreenCanvas(width, height);
  const outlineCtx = outlineCanvas.getContext('2d');

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d')
  }, []);

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
    ctx.current.clearRect(0, 0, ctx.current.canvas.width, ctx.current.canvas.height);
    ctx.current.drawImage(
      outlineCanvas,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      ctx.current.canvas.width, ctx.current.canvas.height,
    );
    ctx.current.restore();
  }, [outlineCanvas, sx, sy, sWidth, sHeight]);

  return <canvas id='outline-canvas'
    className={styles.canvas}
    ref={canvasRef}
    width={width}
    height={height}
    {...props}
  />;
};

export const BrushCanvas = () => { };
