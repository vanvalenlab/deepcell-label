import { makeStyles } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../ProjectContext';

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
  const ctxRef = useRef();

  const composeCanvasRef = useRef();
  const composeCtxRef = useRef();

  useEffect(() => {
    composeCtxRef.current = composeCanvasRef.current.getContext('2d');
    composeCtxRef.current.globalCompositeOperation = 'source-over';
  }, [sh, sw]);

  useEffect(() => {
    ctxRef.current = canvasRef.current.getContext('2d');
    ctxRef.current.imageSmoothingEnabled = false;
  }, [height, width]);

  useEffect(() => {
    composeCtxRef.current.clearRect(0, 0, sw, sh);
    for (let key in canvases) {
      composeCtxRef.current.drawImage(canvases[key], 0, 0);
    }
  }, [canvases, sh, sw]);

  useEffect(() => {
    ctxRef.current.clearRect(0, 0, width, height);
    ctxRef.current.drawImage(
      composeCanvasRef.current,
      sx,
      sy,
      sw / zoom,
      sh / zoom,
      0,
      0,
      width,
      height
    );
  }, [canvases, sx, sy, sw, sh, zoom, width, height]);

  return (
    <>
      <canvas id='compose-canvas' hidden={true} ref={composeCanvasRef} width={sw} height={sh} />
      <canvas id='canvas' className={styles.canvas} ref={canvasRef} width={width} height={height} />
    </>
  );
};

export default ComposeCanvas;
