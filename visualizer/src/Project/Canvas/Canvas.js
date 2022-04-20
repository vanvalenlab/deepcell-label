import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useArrays, useCanvas, useSelect } from '../ProjectContext';
import ComposeCanvas from './ComposeCanvases';
import LabeledCanvas from './LabeledCanvas';
import OutlineCanvas from './OutlineCanvas';
import RawCanvas from './RawCanvas';
import SpotsCanvas from './SpotsCanvas';
import ToolCanvas from './ToolCanvas';

export const Canvas = () => {
  const select = useSelect();

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

  const handleMouseDown = useCallback(
    (event) => {
      event.preventDefault();
      if (event.shiftKey) {
        select.send({ ...event, type: 'SHIFT_CLICK' });
      } else {
        canvas.send(event);
      }
    },
    [canvas, select]
  );

  const [canvases, setCanvases] = useState([]);

  const arrays = useArrays();
  const loading = useSelector(arrays, (state) => state.matches('waiting'));

  return (
    <Box
      id={'canvasBox'}
      sx={style}
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
          {process.env.REACT_APP_SPOTS_VISUALIZER === 'true' && (
            <SpotsCanvas setCanvases={setCanvases} />
          )}
          {process.env.REACT_APP_SPOTS_VISUALIZER !== 'true' && (
            <ToolCanvas setCanvases={setCanvases} />
          )}
        </>
      )}
    </Box>
  );
};

export default Canvas;
