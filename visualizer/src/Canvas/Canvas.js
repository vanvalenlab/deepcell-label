import React, { useEffect } from 'react';
import { useSelector } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';

import RawCanvas from './RawCanvas';
import LabeledCanvas from './LabeledCanvas';
import OutlineCanvas from './OutlineCanvas';
import BrushCanvas from './BrushCanvas';
import ThresholdCanvas from './ThresholdCanvas';

import { useCanvas, useToolbar, useRaw, useLabeled } from '../ServiceContext';

const useStyles = makeStyles({
  canvasBox: {
    alignSelf: 'flex-start',
    position: 'absolute',
    // cursor: 'crosshair',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxHeight: '100%',
    maxWidth: '100%',
  },
});

export const Canvas = () => {

  const raw = useRaw();
  const labeled = useLabeled();

  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);
  const scale = useSelector(canvas, state => state.context.scale);
  
  const grab = useSelector(canvas, state => state.matches('pan.hand'));
  const grabbing = useSelector(canvas, state => state.matches('pan.hand.panning'));
  const dragged = useSelector(canvas, state => state.matches('pan.tool.clickTool.dragged'));

  const cursor = grabbing || dragged ? 'grabbing' : grab ? 'grab' : 'crosshair';

  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const styles = useStyles();

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
    cursor: cursor,
  };

  // prevent scrolling page when over canvas
  useEffect(() => {
    const canvasBox = document.getElementById('canvasBox');
    const wheelListener = e => e.preventDefault();
    const spaceListener = e => { if (e.key === ' ') { e.preventDefault(); } };
    canvasBox.addEventListener('wheel', wheelListener);
    document.addEventListener('keydown', spaceListener);
    return () => {
      canvasBox.removeEventListener('wheel', wheelListener);
      document.removeEventListener('keydown', spaceListener);
    }
  }, []);

  const handleMouseDown = (event) => {
    event.preventDefault();
    canvas.send(event);
    if (event.shiftKey) {
      toolbar.send( {...event, type: 'SHIFTCLICK' });
    } else {
      // toolbar.send(event);
    }
  };

  const handleMouseUp = (e) => {
    canvas.send(e);
  };

  const handleMouseMove = (e) => {
    canvas.send(e);
  }

  return (
    <Box
      id={"canvasBox"}
      className={styles.canvasBox}
      style={borderStyles}
      boxShadow={10}
      width={scale * sw}
      height={scale * sh}
      onMouseMove={handleMouseMove}
      onWheel={canvas.send}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {raw && <RawCanvas className={styles.canvas} />}
      {labeled && <LabeledCanvas className={styles.canvas} />}
      {labeled && <OutlineCanvas className={styles.canvas} />}
      { tool === 'brush' && <BrushCanvas className={styles.canvas} /> }
      { tool === 'threshold' && <ThresholdCanvas className={styles.canvas} /> }
    </Box>
  )
}

export default Canvas;