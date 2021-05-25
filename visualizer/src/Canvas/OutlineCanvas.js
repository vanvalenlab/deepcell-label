import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useTool, useFeature, useLabeled } from '../ServiceContext';
import { highlightImageData, outlineAll, outlineSelected } from '../imageUtils';

const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const red = [255, 0, 0, 255];

const OutlineCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {

  const tool = useTool();
  const foreground = useSelector(tool, state => state.context.foreground);
  const background = useSelector(tool, state => state.context.background);

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const outline = useSelector(labeled, state => state.context.outline);
  const invert = useSelector(labeled, state => state.context.invert);
  const opacity = useSelector(labeled, state => state.context.opacity);

  const feature = useFeature(featureIndex);
  let labeledArray = useSelector(feature, state => state.context.labeledArray);
  if (!labeledArray) { labeledArray = Array(sh).fill(Array(sw).fill(0)); }

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
    switch (outline) {
      case 'all':
        outlineAll(data, labeledArray, fColor);
      case 'selected':
        highlightImageData(data, labeledArray, foreground, hColor);
        outlineSelected(data, labeledArray, foreground, background, fColor, bColor);
      default:
    }
    hiddenCtx.current.putImageData(data, 0, 0);
  }, [labeledArray, foreground, background, outline, invert, sw, sh]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(
      hiddenCanvasRef.current,
      sx, sy,
      sw / zoom, sh / zoom,
      0, 0,
      width, height,
    );
    ctx.current.restore();
  }, [labeledArray, foreground, background, outline, invert, sw, sh, sx, sy, zoom, width, height]);

  return <>
    {/* hidden processing canvas */}
    <canvas id='outline-processing'
      hidden={true}
      ref={hiddenCanvasRef}
      width={sw}
      height={sh}
    />
    <canvas id='outline-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  </>;
};

export default React.memo(OutlineCanvas);