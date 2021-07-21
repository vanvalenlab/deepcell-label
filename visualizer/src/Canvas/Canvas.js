import Box from '@material-ui/core/Box';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';
import { useSelector } from '@xstate/react';
import React, { useEffect } from 'react';
import LabeledCanvas from './Labeled/LabeledCanvas';
import OutlineCanvas from './Labeled/OutlineCanvas';
import {
  useCanvas,
  useLabeled,
  useRaw,
  useSelect,
  useToolbar,
} from '../ServiceContext';
import RawCanvas from './Raw/RawCanvas';
import BrushCanvas from './Tool/BrushCanvas';
import ThresholdCanvas from './Tool/ThresholdCanvas';

const useStyles = makeStyles({
  canvasBox: {
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

export const Canvas = () => {
  const raw = useRaw();
  const labeled = useLabeled();
  const select = useSelect();

  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);
  const scale = useSelector(canvas, state => state.context.scale);

  const grab = useSelector(canvas, state => state.matches('pan.hand'));
  const grabbing = useSelector(canvas, state =>
    state.matches('pan.hand.panning')
  );
  const dragged = useSelector(canvas, state =>
    state.matches('pan.tool.clickTool.dragged')
  );

  const cursor = grabbing || dragged ? 'grabbing' : grab ? 'grab' : 'crosshair';

  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const styles = useStyles();

  // dynamic canvas border styling based on position
  const padding = 5;
  const topColor = Math.floor(sy) === 0 ? 'white' : 'black';
  const bottomColor = Math.ceil(sy + sh / zoom) === sh ? 'white' : 'black';
  const rightColor = Math.ceil(sx + sw / zoom) === sw ? 'white' : 'black';
  const leftColor = Math.floor(sx) === 0 ? 'white' : 'black';
  const canvasStyles = {
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
    const spaceListener = e => {
      if (e.key === ' ') {
        e.preventDefault();
      }
    };
    canvasBox.addEventListener('wheel', wheelListener);
    document.addEventListener('keydown', spaceListener);
    return () => {
      canvasBox.removeEventListener('wheel', wheelListener);
      document.removeEventListener('keydown', spaceListener);
    };
  }, []);

  const handleMouseDown = event => {
    event.preventDefault();
    if (event.shiftKey) {
      select.send({ ...event, type: 'SHIFT_CLICK' });
    } else {
      canvas.send(event);
    }
  };

  return (
    <Box
      id={'canvasBox'}
      className={styles.canvasBox}
      style={canvasStyles}
      boxShadow={10}
      width={scale * sw}
      height={scale * sh}
      onMouseMove={canvas.send}
      onWheel={canvas.send}
      onMouseDown={handleMouseDown}
      onMouseUp={canvas.send}
    >
      {!raw && (
        <CircularProgress
          style={{ margin: '25%', width: '50%', height: '50%' }}
        />
      )}
      {raw && <RawCanvas className={styles.canvas} />}
      {labeled && <LabeledCanvas className={styles.canvas} />}
      {labeled && <OutlineCanvas className={styles.canvas} />}
      {tool === 'brush' && <BrushCanvas className={styles.canvas} />}
      {tool === 'threshold' && <ThresholdCanvas className={styles.canvas} />}
    </Box>
  );
};

export default Canvas;
