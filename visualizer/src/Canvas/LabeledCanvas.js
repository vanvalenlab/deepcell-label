import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';
import { useFeature, useImage, useTool } from '../ServiceContext';

/**
 * Highlights a label with color.
 * @param {ImageData} imageData where we draw the highlight
 * @param {Array} labeledArray describes label at each pixel; has negative label values on label border
 * @param {int} label label to highlight
 * @param {Array} color color to highlight label with
 */
const highlightImageData = (imageData, labeledArray, label, color) => {
  const [r, g, b, a] = color;
  const { data, width, height } = imageData;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      const element = Math.abs(labeledArray[j][i]);
      if (element === label) {
        data[(j * width + i) * 4 + 0] = r;
        data[(j * width + i) * 4 + 1] = g;
        data[(j * width + i) * 4 + 2] = b;
        data[(j * width + i) * 4 + 3] = a;
      }
    }
  }
};

/**
 * Makes the areas without a label (i.e. label is 0) transparent.
 * @param {ImageData} imageData where we draw the transparent changes
 * @param {Array} labeledArray describes label at each pixel; has negative label values on label border
 */
const removeNoLabelImageData = (imageData, labeledArray) => {
  const { data, height, width } = imageData;
  for (let j = 0; j < height; j += 1) { // y
    for (let i = 0; i < width; i += 1) { // x
      if (labeledArray[j][i] === 0) {
        data[(j * width + i) * 4 + 0] = 0;
        data[(j * width + i) * 4 + 1] = 0;
        data[(j * width + i) * 4 + 2] = 0;
        data[(j * width + i) * 4 + 3] = 0;
      }
    }
  }
};

/**
 * Changes the opacity of the image.
 * @param {ImageData} imageData
 * @param {float} opacity between 0 and 1; 0 makes the image transparent, and 1 does nothing
 */
const opacityImageData = (imageData, opacity) => {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] *= opacity;
  }
};

export const LabeledCanvas = ({ sx, sy, sw, sh, zoom, width, height, className }) => {
  const image = useImage();
  const highlight = useSelector(image, state => state.context.highlight);
  const showNoLabel = useSelector(image, state => state.context.showNoLabel);
  const opacity = useSelector(image, state => state.context.opacity);
  
  const feature = useFeature();
  const labeledImage = useSelector(feature, state => state.context.labeledImage);
  let labeledArray = useSelector(feature, state => state.context.labeledArray);
  if (!labeledArray) { labeledArray = Array(sh).fill(Array(sw).fill(0)) }

  const tool = useTool();
  const foreground = useSelector(tool, state => state.context.foreground);
  const background = useSelector(tool, state => state.context.background);

  const canvasRef = useRef();
  const ctx = useRef();
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
    hiddenCtx.current.drawImage(labeledImage, 0, 0);
    let data = hiddenCtx.current.getImageData(0, 0, sw, sh);
    if (highlight && foreground !== 0) {
      const red = [255, 0, 0, 255];
      highlightImageData(data, labeledArray, foreground, red);
    }
    if (!showNoLabel) {
      removeNoLabelImageData(data, labeledArray);
    }
    opacityImageData(data, opacity);
    hiddenCtx.current.putImageData(data, 0, 0);
  }, [labeledImage, labeledArray, foreground, highlight, showNoLabel, opacity, sh, sw]);

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
  }, [labeledImage, labeledArray, foreground, highlight, showNoLabel, opacity, sw, sh, sx, sy, zoom, width, height]);

  return <>
    {/* hidden processing canvas */}
    <canvas id='labeled-processing'
      hidden={true}
      ref={hiddenCanvasRef}
      width={sw}
      height={sh}
    />
    <canvas id='labeled-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  </>;
};

export default React.memo(LabeledCanvas);
