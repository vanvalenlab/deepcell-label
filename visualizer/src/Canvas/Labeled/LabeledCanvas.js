import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import {
  useCanvas,
  useColormap,
  useImage,
  useLabelArray,
  useLabeled,
  useSelect,
} from '../../ProjectContext';
import { createSegmentationImageData, highlightImageData, opacityImageData } from '../canvasUtils';

export const LabeledCanvas = ({ className }) => {
  const canvas = useCanvas();
  const image = useImage();
  const labeled = useLabeled();
  const select = useSelect();
  // const segment = useSegment();

  const canvasRef = useRef();
  const ctx = useRef();
  const hiddenCanvasRef = useRef();
  const hiddenCtx = useRef();

  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const scale = useSelector(canvas, state => state.context.scale);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);
  const frameId = useSelector(image, state => state.context.frame);
  const highlight = useSelector(labeled, state => state.context.highlight);
  const opacity = useSelector(labeled, state => state.context.opacity);
  const featureId = useSelector(labeled, state => state.context.feature);
  const foreground = useSelector(select, state => state.context.foreground);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;
  const array = useLabelArray(featureId, frameId);
  const colormap = useColormap(featureId);

  // // sync segment machine with array
  // useEffect(() => {
  //   segment.send({ type: 'ARRAY', array });
  // }, [segment, array]);

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [width, height]);

  useEffect(() => {
    hiddenCtx.current = hiddenCanvasRef.current.getContext('2d');
  }, [sw, sh]);

  useEffect(() => {
    const data = createSegmentationImageData(array, colormap, sw, sh);
    if (highlight && foreground !== 0) {
      const red = [255, 0, 0, 255];
      highlightImageData(data, array, foreground, red);
    }
    opacityImageData(data, opacity);
    hiddenCtx.current.putImageData(data, 0, 0);
  }, [array, colormap, foreground, highlight, opacity, sh, sw]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(
      hiddenCanvasRef.current,
      sx,
      sy,
      sw / zoom,
      sh / zoom,
      0,
      0,
      width,
      height
    );
    ctx.current.restore();
  }, [array, foreground, highlight, opacity, sw, sh, sx, sy, zoom, width, height]);

  return (
    <>
      {/* hidden processing canvas */}
      <canvas id='labeled-processing' hidden={true} ref={hiddenCanvasRef} width={sw} height={sh} />
      <canvas
        id='labeled-canvas'
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
      />
    </>
  );
};

export default LabeledCanvas;
