import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSelector } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabeledCanvas from './LabeledCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';

// import { canvasService } from '../statechart/service';
import { useCanvas, useTool, useRaw, useLabeled } from '../ServiceContext';

const useStyles = makeStyles({
  canvasBox: {
    alignSelf: 'flex-start',
    position: 'absolute',
    cursor: 'crosshair',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxHeight: '100%',
    maxWidth: '100%',
  },
});

export const Canvas = ({ height, width }) => {

  const raw = useRaw();
  const labeled = useLabeled();

  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);
  const scale = useSelector(canvas, state => state.context.scale);
  const canvasProps = { sx, sy, zoom, sw, sh };

  const tool = useTool();

  const styles = useStyles();

  useEffect(() => {
    const padding = 5;
    canvas.send({ type: 'RESIZE', width, height, padding });
  }, [canvas, width, height, sh, sw]);

  // dynamic canvas border styling based on position
  const padding = 5;
  const topColor = (Math.floor(sy) === 0) ? 'white' : 'black';
  const bottomColor = (Math.ceil(sy + sh / zoom) === sw) ? 'white' : 'black';
  const rightColor = (Math.ceil(sx + sw / zoom) === sw) ? 'white' : 'black';
  const leftColor = (Math.floor(sx) === 0) ? 'white' : 'black';
  const borderStyles = {
    borderTop: `${padding}px solid ${topColor}`,
    borderBottom: `${padding}px solid ${bottomColor}`,
    borderLeft: `${padding}px solid ${leftColor}`,
    borderRight: `${padding}px solid ${rightColor}`,
  };

  const styleProps = {
    className: styles.canvas,
    width: sw * scale * window.devicePixelRatio,
    height: sh * scale * window.devicePixelRatio,
  };

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
    // if (event.shiftKey) {
    //   tool.send( {...event, type: 'SHIFTCLICK' })
    // } else {
    //   tool.send(event);
    // }
    event.preventDefault();
    tool.send(event);
  };

  return (
    <Box
      id={"canvasBox"}
      className={styles.canvasBox}
      style={borderStyles}
      boxShadow={10}
      width={scale * sw}
      height={scale * sh}
      onMouseMove={canvas.send}
      onWheel={canvas.send}
      onMouseDown={handleMouseDown}
      onMouseUp={tool.send}
      onClick={tool.send}
    >
      {raw && <RawCanvas {...canvasProps} {...styleProps} />}
      {labeled && <LabeledCanvas {...canvasProps} {...styleProps} />}
      {labeled && <OutlineCanvas {...canvasProps} {...styleProps} />}
      {/* <BrushCanvas {...canvasProps} {...styleProps} /> */}
    </Box>
  )
}

export default Canvas;