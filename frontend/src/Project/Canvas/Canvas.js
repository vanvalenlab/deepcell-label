import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React, { useEffect, useMemo, useState } from 'react';
import { useArrays, useCanvas } from '../ProjectContext';
import ComposeCanvas from './ComposeCanvas';
import LabeledCanvas from './LabeledCanvas';
import OutlineCanvas from './OutlineCanvas';
import RawCanvas from './RawCanvas';
import SpotsCanvas from './SpotsCanvas';
import ToolCanvas from './ToolCanvas';

function Canvas() {
  const canvas = useCanvas();
  const { sx, sy, zoom, sw, sh, scale, grab, grabbing, dragged } = useSelector(
    canvas,
    (state) => {
      const { sx, sy, zoom, width, height, scale } = state.context;
      const grab = state.matches('pan.grab');
      const grabbing = state.matches('pan.grab.panning');
      const dragged = state.matches('pan.interactive.panOnDrag.dragged');
      return { sx, sy, zoom, sw: width, sh: height, scale, grab, grabbing, dragged };
    },
    equal
  );

  const padding = 5;
  const topColor = Math.floor(sy) === 0 ? 'white' : 'black';
  const bottomColor = Math.ceil(sy + sh / zoom) === sh ? 'white' : 'black';
  const rightColor = Math.ceil(sx + sw / zoom) === sw ? 'white' : 'black';
  const leftColor = Math.floor(sx) === 0 ? 'white' : 'black';

  const cursor = grabbing || dragged ? 'grabbing' : grab ? 'grab' : 'crosshair';

  const style = useMemo(
    () => ({
      alignSelf: 'flex-start',
      position: 'absolute',
      borderTop: `${padding}px solid ${topColor}`,
      borderBottom: `${padding}px solid ${bottomColor}`,
      borderLeft: `${padding}px solid ${leftColor}`,
      borderRight: `${padding}px solid ${rightColor}`,
      cursor: cursor,
    }),
    [padding, topColor, bottomColor, leftColor, rightColor, cursor]
  );

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

  const [bitmaps, setBitmaps] = useState([]);

  const arrays = useArrays();
  const loading = useSelector(arrays, (state) => state.matches('setUp'));

  return (
    <Box
      id={'canvasBox'}
      sx={style}
      boxShadow={3}
      width={scale * sw}
      height={scale * sh}
      onMouseMove={canvas.send}
      onWheel={canvas.send}
      onMouseDown={(e) => {
        canvas.send(e);
        e.preventDefault(); // avoid selecting copyright text when double clicking
      }}
      onMouseUp={canvas.send}
    >
      {loading ? (
        <CircularProgress style={{ margin: '25%', width: '50%', height: '50%' }} />
      ) : (
        <>
          <ComposeCanvas bitmaps={bitmaps} />
          <RawCanvas setBitmaps={setBitmaps} />
          <LabeledCanvas setBitmaps={setBitmaps} />
          <OutlineCanvas setBitmaps={setBitmaps} />
          <SpotsCanvas setBitmaps={setBitmaps} />
          <ToolCanvas setBitmaps={setBitmaps} />
        </>
      )}
    </Box>
  );
}

export default Canvas;
