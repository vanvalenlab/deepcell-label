import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import { labelService } from '../statechart/service';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabelCanvas from './LabelCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';

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
      boxSizing: 'border-box',
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

function calculateScale(width, height, padding, maxWidth, maxHeight) {
  const scaleX = (maxWidth - 2 * padding) / width;
  const scaleY = (maxHeight - 2 * padding) / height;
  // pick scale that accomodates both dimensions; can be less than 1
  const scale = Math.min(scaleX, scaleY);
  return scale;
}

export const Canvas = props => {
  const { zoom, width, height, ...rest } = props;
  const [imageWidth, imageHeight] = [160, 160];
  const padding = 5;
  const scale = calculateScale(imageWidth, imageHeight, padding, width, height);
  const scaledWidth = scale * imageWidth;
  const scaledHeight = scale * imageHeight;

  const styles = useStyles();

  const canvasProps = {
    className: styles.canvas,
    zoom: zoom,
    width: scaledWidth * window.devicePixelRatio,
    height: scaledHeight * window.devicePixelRatio,
  }

  return (
    <Box className={styles.canvasBox} boxShadow={10} width={scaledWidth + 2 * padding} height={scaledHeight + 2 * padding} >
      {/* <canvas id='canvas' width={scaledWidth} height={scaledHeight}/> */}
      {/* <RawCanvas className={styles.canvas} zoom={zoom} width={scaledWidth} height={scaledHeight}/>
      <LabelCanvas className={styles.canvas} zoom={zoom} width={scaledWidth} height={scaledHeight}/>
      <OutlineCanvas className={styles.canvas} zoom={zoom} width={scaledWidth} height={scaledHeight}/> */}
      <RawCanvas {...canvasProps} />
      <LabelCanvas {...canvasProps}/>
      <OutlineCanvas {...canvasProps} />
      <BrushCanvas {...canvasProps} />
    </Box>
  )
}

export default Canvas;