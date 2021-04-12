import React, { useState, useEffect, useRef, useContext } from 'react';
import { useActor } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabeledCanvas from './LabeledCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';

// import { canvasService } from '../statechart/service';
import { useCanvas, useTool } from '../ServiceContext';

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
  const [currentCanvas, sendCanvas] = useCanvas();
  const { sx, sy, zoom, scale, width, height } = currentCanvas.context;

  const [currentLabeler, sendLabeler] = useTool();

  const styles = useStyles();

  useEffect(() => {
    const padding = 5;
    sendCanvas({ type: 'RESIZE', width: props.width, height: props.height, padding: padding });
  }, [sendCanvas, props.width, props.height, height, width]);

  // dynamic canvas border styling based on position
  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = (Math.ceil(sy + height / zoom) === height) ? 'white' : 'black';
  const rightColor = (Math.ceil(sx + width / zoom) === width) ? 'white' : 'black';
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
    const canvasBox = document.getElementById("canvasBox");
    canvasBox.addEventListener("wheel", e => e.preventDefault());
    document.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); } })
    return () => {
      canvasBox.removeEventListener("wheel", e => e.preventDefault());
      document.removeEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); } })
    }
  }, []);

  const handleMouseDown = (event) => {
    if (event.shiftKey) {
      sendLabeler( {...event, type: 'SHIFTCLICK' })
    } else {
      sendLabeler(event);
    }
  };

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
      onMouseDown={handleMouseDown}
      onMouseUp={sendLabeler}
      onClick={sendLabeler}
    >
      <RawCanvas {...canvasProps} />
      <LabeledCanvas {...canvasProps}/>
      <OutlineCanvas {...canvasProps} />
      <BrushCanvas {...canvasProps} />
    </Box>
  )
}

export default Canvas;