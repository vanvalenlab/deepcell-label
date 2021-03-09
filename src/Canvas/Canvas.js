import React, { useState, useEffect, useRef } from 'react';
import { useService } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabelCanvas from './LabelCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';

import { labelService, canvasService } from '../statechart/service';

const useStyles = makeStyles({
    canvasBox: {
      // boxSizing: 'border-box',
      alignSelf: 'flex-start',
      position: 'absolute',
    },
    canvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      maxHeight: '100%',
      maxWidth: '100%',
    },
});

export const Canvas = props => {
  const [currentCanvas, sendCanvas] = useService(canvasService);
  const { sx, sy, zoom, scale, width, height } = currentCanvas.context;

  const styles = useStyles();

  useEffect(() => {
    const padding = 5;
    sendCanvas({ type: 'RESIZE', width: props.width, height: props.height, padding: padding });
  }, [sendCanvas, props.width, props.height]);

  // dynamic canvas border styling based on position
  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = (Math.ceil(sy + width / zoom) === height) ? 'white' : 'black';
  const rightColor = (Math.ceil(sx + height / zoom) === width) ? 'white' : 'black';
  const leftColor = (Math.floor(sx) === 0) ? 'white' : 'black';
  const borderStyles = {
    borderTop: `${padding}px solid ${topColor}`,
    borderBottom: `${padding}px solid ${bottomColor}`,
    borderLeft: `${padding}px solid ${leftColor}`,
    borderRight: `${padding}px solid ${rightColor}`,
  };

  const canvasProps = {
    className: styles.canvas,
    width: width * scale * window.devicePixelRatio,
    height: height * scale * window.devicePixelRatio,
  }

  // prevent scrolling page when over canvas
  useEffect(() => {
    document.getElementById("canvasBox").addEventListener("wheel", e => e.preventDefault());
    return () => {
      document.getElementById("canvasBox").removeEventListener("wheel", e => e.preventDefault());
    }
  }, []);

  return (
    <Box
      id={"canvasBox"}
      className={styles.canvasBox}
      style={borderStyles}
      boxShadow={10}
      width={scale * width}
      height={scale * height}
      onMouseMove={sendCanvas}
      onWheel={sendCanvas}
    >
      <RawCanvas {...canvasProps} />
      <LabelCanvas {...canvasProps}/>
      <OutlineCanvas {...canvasProps} />
      <BrushCanvas {...canvasProps} />
    </Box>
  )
}

export default Canvas;