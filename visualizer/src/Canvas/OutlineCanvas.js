import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useTool, useFeature, useLabeled } from '../ServiceContext';

/**
 * Draws fColor around the foreground label and bColor 
 * @param {ImageData} imageData where to draw outlines
 * @param {Array} labeledArray describes the label at each pixel; has negative values on the label borders
 * @param {int} foreground value of foreground label
 * @param {int} background value of background label
 * @param {Array} fColor RGBA color
 * @param {Array} bColor RGBA color
 */
function outlineSelected(imageData, labeledArray, foreground, background, fColor, bColor) {
  const [fr, fg, fb, fa] = fColor;
  const [br, bg, bb, ba] = bColor;
  const { data, width, height } = imageData;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      const label = labeledArray[j][i];
      if (foreground !== 0 && label === -1 * foreground) {
        data[(j * width + i) * 4 + 0] = fr;
        data[(j * width + i) * 4 + 1] = fg;
        data[(j * width + i) * 4 + 2] = fb;
        data[(j * width + i) * 4 + 3] = fa;
      // } else if (background !== 0 && label === -1 * background) {
      //   data[(j * width + i) * 4 + 0] = br;
      //   data[(j * width + i) * 4 + 1] = bg;
      //   data[(j * width + i) * 4 + 2] = bb;
      //   data[(j * width + i) * 4 + 3] = ba;
      }
    }
  }
}

/**
 * Draws color outlines around all labels in labeledArray.
 * @param {ImageData} imageData where to draw outlines
 * @param {Array} labeledArray describes the label at each pixel; has negative values on the label borders 
 * @param {Array} color RGBA color
 * @returns 
 */
function outlineAll(imageData, labeledArray, color) {
  const { data, width, height } = imageData;
  const [r, g, b, a] = color;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      const label = labeledArray[j][i];
      if (label < 0) {
        data[(j * width  + i) * 4 + 0] = r;
        data[(j * width  + i) * 4 + 1] = g;
        data[(j * width  + i) * 4 + 2] = b;
        data[(j * width  + i) * 4 + 3] = a;
      }
    }
  }
}

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
    switch (outline) {
      case 'all':
        outlineAll(data, labeledArray, fColor);
      case 'selected':
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