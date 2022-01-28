import makeStyles from '@mui/styles/makeStyles';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useDrawCanvas } from '../ProjectContext';

const useStyles = makeStyles({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxHeight: '100%',
    maxWidth: '100%',
  },
});

export const ComposeCanvas = ({ canvases }) => {
  const styles = useStyles();

  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const canvasRef = useRef();
  const composeCanvasRef = useDrawCanvas();

  useEffect(() => {
    composeCanvasRef.current.getContext('2d').globalCompositeOperation = 'source-over';
  }, [composeCanvasRef]);

  useEffect(() => {
    canvasRef.current.getContext('2d').imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    const ctx = composeCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, sw, sh);
    for (let key in canvases) {
      ctx.drawImage(canvases[key], 0, 0);
    }
  }, [canvases, sh, sw, composeCanvasRef]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(composeCanvasRef.current, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
  }, [canvases, sx, sy, sw, sh, zoom, width, height, composeCanvasRef]);

  return (
    <canvas id='canvas' className={styles.canvas} ref={canvasRef} width={width} height={height} />
  );
};

export default ComposeCanvas;
