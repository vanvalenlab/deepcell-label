import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useSelector } from '@xstate/react';
import React, { useEffect } from 'react';
import { useArrays, useCanvas, useSegment, useSelect } from '../ProjectContext';
import ComposeCanvas from './ComposeCanvases';
import LabeledCanvas from './Labeled/LabeledCanvas';
import OutlineCanvas from './Labeled/OutlineCanvas';
import RawCanvas from './Raw/RawCanvas';
import BrushCanvas from './Tool/BrushCanvas';
import ThresholdCanvas from './Tool/ThresholdCanvas';

export const Canvas = () => {
  const select = useSelect();

  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const grab = useSelector(canvas, (state) => state.matches('grab'));
  const grabbing = useSelector(canvas, (state) => state.matches('grab.panning'));
  const dragged = useSelector(canvas, (state) => state.matches('interactive.panOnDrag.dragged'));
  const cursor = grabbing || dragged ? 'grabbing' : grab ? 'grab' : 'crosshair';

  const segment = useSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  // dynamic canvas border styling based on position
  const padding = 5;
  const topColor = Math.floor(sy) === 0 ? 'white' : 'black';
  const bottomColor = Math.ceil(sy + sh / zoom) === sh ? 'white' : 'black';
  const rightColor = Math.ceil(sx + sw / zoom) === sw ? 'white' : 'black';
  const leftColor = Math.floor(sx) === 0 ? 'white' : 'black';

  // prevent scrolling page when over canvas
  useEffect(() => {
    const canvasBox = document.getElementById('canvasBox');
    const wheelListener = (e) => e.preventDefault();
    const spaceListener = (e) => {
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

  const handleMouseDown = (event) => {
    event.preventDefault();
    if (event.shiftKey) {
      select.send({ ...event, type: 'SHIFT_CLICK' });
    } else {
      canvas.send(event);
    }
  };

  const [canvases, setCanvases] = React.useState([]);

  const arrays = useArrays();
  const loading = useSelector(arrays, (state) => state.matches('waiting'));

  return (
    <Box
      id={'canvasBox'}
      sx={{
        alignSelf: 'flex-start',
        position: 'absolute',
        borderTop: `${padding}px solid ${topColor}`,
        borderBottom: `${padding}px solid ${bottomColor}`,
        borderLeft: `${padding}px solid ${leftColor}`,
        borderRight: `${padding}px solid ${rightColor}`,
        cursor: cursor,
      }}
      boxShadow={10}
      width={scale * sw}
      height={scale * sh}
      onMouseMove={canvas.send}
      onWheel={canvas.send}
      onMouseDown={handleMouseDown}
      onMouseUp={canvas.send}
    >
      {loading ? (
        <CircularProgress style={{ margin: '25%', width: '50%', height: '50%' }} />
      ) : (
        <>
          <ComposeCanvas canvases={canvases} />
          <RawCanvas setCanvases={setCanvases} />
          <LabeledCanvas setCanvases={setCanvases} />
          <OutlineCanvas setCanvases={setCanvases} />
          {tool === 'brush' && <BrushCanvas setCanvases={setCanvases} />}
          {tool === 'threshold' && <ThresholdCanvas setCanvases={setCanvases} />}
        </>
      )}
    </Box>
  );
};

export default Canvas;
