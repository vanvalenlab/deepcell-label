import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabelCanvas from './LabelCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';

import { labelService, canvasService } from '../statechart/service';


const useStyles = makeStyles(() => {
  const [current, send] = useService(labelService);
  // const { sx, sy, sWidth, sHeight, width, height } = current.context;
  const [sx, sy, scale, zoom, width, height] = [0, 0, 1, 1, 160, 160];

  const sWidth = width / zoom;
  const sHeight = height / zoom;

  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = (Math.ceil(sy + sHeight) === height) ? 'white' : 'black';
  const rightColor = (Math.ceil(sx + sWidth) === width) ? 'white' : 'black';
  const leftColor = (Math.floor(sx) === 0) ? 'white' : 'black';

  return {
    canvasBox: {
      // boxSizing: 'border-box',
      alignSelf: 'flex-start',
      position: 'absolute',
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
    },
    canvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      maxHeight: '100%',
      maxWidth: '100%',
    },
  };
});

export const Canvas = props => {
  const { zoom, ...rest } = props;
  const [currentCanvas, sendCanvas] = useService(canvasService);
  const { scale, width, height } = currentCanvas.context;

  const styles = useStyles();

  const handleMouseMove = (event) => {
    sendCanvas(event);
  };

  useEffect(() => {
    const padding = 5;
    sendCanvas({ type: 'RESIZE', width: props.width, height: props.height, padding: padding });
  }, [sendCanvas, props.width, props.height]);

  const canvasProps = {
    className: styles.canvas,
    zoom: zoom,
    width: width * scale * window.devicePixelRatio,
    height: height * scale * window.devicePixelRatio,
  }

  return (
    <Box
      className={styles.canvasBox}
      boxShadow={10}
      width={scale * width}
      height={scale * height}
      onMouseMove={handleMouseMove}
    >
      <RawCanvas {...canvasProps} />
      <LabelCanvas {...canvasProps}/>
      <OutlineCanvas {...canvasProps} />
      <BrushCanvas {...canvasProps} />
    </Box>
  )
}

export default Canvas;