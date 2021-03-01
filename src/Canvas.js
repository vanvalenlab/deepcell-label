import React, { useState, useEffect } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import useCanvas from './useCanvas';
import { labelService } from './service';


const useStyles = makeStyles(() => {
  const [current, send] = useService(labelService);
  // const { sx, sy, sWidth, sHeight, width, height } = current.context;
  const [sx, sy, sWidth, sHeight, width, height] = [0, 0, 160, 160, 4 * 160, 4 * 160];

  const padding = 5;
  const topColor = 'red'; // (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = 'green'; // (Math.ceil(sy + sHeight) === height) ? 'white' : 'black';
  const rightColor = 'blue'; // (Math.ceil(sx + sWidth) === width) ? 'white' : 'black';
  const leftColor = 'pink'; // (Math.floor(sx) === 0) ? 'white' : 'black';

  return {
    canvas: {
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
    }
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