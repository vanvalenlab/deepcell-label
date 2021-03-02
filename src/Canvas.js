import React, { useState, useEffect } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import useCanvas from './useCanvas';
import { labelService } from './service';


const useStyles = makeStyles(() => {
  const [current, send] = useService(labelService);
  // const { sx, sy, sWidth, sHeight, width, height } = current.context;
  const [sx, sy, sWidth, sHeight, width, height] = [0, 0, 4* 160, 4* 160, 4 * 160, 4 * 160];

  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = (Math.ceil(sy + sHeight) === height) ? 'white' : 'black';
  const rightColor = (Math.ceil(sx + sWidth) === width) ? 'white' : 'black';
  const leftColor = (Math.floor(sx) === 0) ? 'white' : 'black';

  return {
    canvas: {
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
      position: 'absolute',
    },
    empty: {},
  };
});

const width = 160;
const height = 160;
const padding = 5;

function useScaledDimensions(element, width, height, padding) {
  const maxHeight = element?.clientHeight || 0;
  const maxWidth = element?.clientWidth || 0;

  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;

  // pick scale that accomodates both dimensions
  const scale = Math.min(scaleX, scaleY);
  const scaledHeight = height * scale + 2 * padding;
  const scaledWidth = width * scale + 2 * padding;
  return [scale, scaledHeight, scaledWidth];
}


const Canvas = props => {
  const styles = useStyles();
  const [current, send] = useService(labelService);
  // const { sx, sy, sWidth, sHeight } = current.state.context;
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  
  // const [scale, scaledHeight, scaledWidth] = useScaledDimensions(height, width, padding);
  const [scale, scaledHeight, scaledWidth] = [4, 4 * 160, 4 * 160];
  
  // const [raw, label, labelArray] = current.state.context;
  const [data, setData] = useState(null);
  const [raw, setRaw] = useState(new Image());
  const [label, setLabel] = useState(new Image());
  const [labelArray, setLabelArray] = useState([[]]);

  const draw = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(
      raw,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      scaledWidth,
      scaledHeight
    );
  };
  
  const canvasRef = useCanvas(draw);


  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(
        'http://0.0.0.0:5000/api/project/qUtuBnLdw5S-',
      );
      console.log(result.data);
      setData(result.data);
      const rawImage = new Image();
      rawImage.src = result.data.imgs.raw;
      setRaw(rawImage);
      const labelImage = new Image();
      labelImage.src = result.data.imgs.segmented;
      setLabel(labelImage);
    };
 
    fetchData();
  }, []);
  
  return <canvas id='canvas'
    className={styles.canvas}
    ref={canvasRef}
    width={scaledWidth}
    height={scaledHeight}
    {...props}
  />;
};

export default Canvas;

export const EmptyCanvas = props => {
  const styles = useStyles();
  const [scale, scaledHeight, scaledWidth] = [4, 4 * 160, 4 * 160];

  return <canvas id='canvas'
    className={styles.empty}
    width={scaledWidth}
    height={scaledHeight}
    {...props}
  />;
}

export const RawCanvas = props => { 
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [raw, setRaw] = useState(new Image());
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 4 * 160, 4 * 160];

  const draw = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(
      raw,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      scaledWidth,
      scaledHeight
    );
  };

  const canvasRef = useCanvas(draw);

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
    width={scaledWidth}
    height={scaledHeight}
    {...props}
  />;
};

export const LabelCanvas = props => { 
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [label, setLabel] = useState(new Image());
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 4 * 160, 4 * 160];

  const draw = (ctx) => {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      label,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  };

  const canvasRef = useCanvas(draw);

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
    width={scaledWidth}
    height={scaledHeight}
    {...props}
  />;
};

export const OutlineCanvas = props => {
  const styles = useStyles();
  const [current, send] = useService(labelService);
  const [labelArray, setLabelArray] = useState([[0]]);
  const [sx, sy, sWidth, sHeight] = [0, 0, 160, 160];
  const [scale, scaledHeight, scaledWidth] = [4, 4 * 160, 4 * 160];
  const [width, height] = [160, 160];
  const [foreground, background] = [1, 2];
  const [all, setAll] = useState(false);

  const outlineCanvas = new OffscreenCanvas(width, height);
  const outlineCtx = outlineCanvas.getContext('2d');

  const draw = (ctx) => {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(
      outlineCanvas,
      sx, sy,
      sWidth, sHeight,
      0, 0,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  };

  const canvasRef = useCanvas(draw);

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

  return <canvas id='outline-canvas'
    className={styles.canvas}
    ref={canvasRef}
    width={scaledWidth}
    height={scaledHeight}
    {...props}
  />;
};

export const BrushCanvas = () => { };
