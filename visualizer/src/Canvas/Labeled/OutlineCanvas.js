import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useLabeled, useSelect } from '../../ProjectContext';
import { highlightImageData, outlineAll, outlineSelected } from '../canvasUtils';

const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const red = [255, 0, 0, 255];

const OutlineCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, state => state.context.sx);
  const sy = useSelector(canvas, state => state.context.sy);
  const zoom = useSelector(canvas, state => state.context.zoom);
  const scale = useSelector(canvas, state => state.context.scale);
  const sw = useSelector(canvas, state => state.context.width);
  const sh = useSelector(canvas, state => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const select = useSelect();
  const foreground = useSelector(select, state => state.context.foreground);
  const background = useSelector(select, state => state.context.background);

  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);
  const outline = useSelector(labeled, state => state.context.outline);
  const invert = useSelector(labeled, state => state.context.invert);
  // const opacity = useSelector(labeled, state => state.context.opacity);

  let labeledArray = Array(sh).fill(Array(sw).fill(0));

  const canvasRef = useRef();
  const ctx = useRef();
  // hidden canvas convert the outline array into an image
  const hiddenCanvasRef = useRef();
  const hiddenCtx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [width, height]);

  useEffect(() => {
    hiddenCtx.current = hiddenCanvasRef.current.getContext('2d');
  }, [sw, sh]);

  useEffect(() => {
    const width = labeledArray[0].length;
    const height = labeledArray.length;
    const data = new ImageData(width, height);
    const fColor = invert ? black : white;
    const bColor = red;
    const hColor = [255, 255, 255, 128];
    highlightImageData(data, labeledArray, foreground, hColor);
    if (outline) {
      outlineAll(data, labeledArray, fColor);
    }
    outlineSelected(data, labeledArray, foreground, background, fColor, bColor);
    hiddenCtx.current.putImageData(data, 0, 0);
  }, [labeledArray, foreground, background, outline, invert, sw, sh]);

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
  }, [labeledArray, foreground, background, outline, invert, sw, sh, sx, sy, zoom, width, height]);

  return (
    <>
      {/* hidden processing canvas */}
      <canvas id='outline-processing' hidden={true} ref={hiddenCanvasRef} width={sw} height={sh} />
      <canvas
        id='outline-canvas'
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
      />
    </>
  );
};

export default OutlineCanvas;
