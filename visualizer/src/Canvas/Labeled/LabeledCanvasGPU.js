import { useSelector } from '@xstate/react';
import colormap from 'colormap';
import { GPU } from 'gpu.js';
import React, { useEffect, useMemo, useRef } from 'react';
import { useCanvas, useFeature, useLabeled, useSelect } from '../../ProjectContext';

function getColormap(colormapName, nShades, format) {
  const minimum = colormap.cm[colormapName].length;
  let gap = minimum;
  for (let i = 0; gap < minimum; gap++) {
    if (i * (nShades - 1) + nShades >= minimum) {
      gap = i;
      break;
    }
  }
  const tempNShades = Math.max(minimum, nShades + gap * (nShades - 1));
  const tempCmap = colormap({ colormap: colormapName, nShades: tempNShades, format });
  return tempCmap.filter((_, i) => i % gap === 0);
}

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const scale = useSelector(canvas, (state) => state.context.scale);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.opacity);
  // const highlightColor = [255, 0, 0];

  const feature = useFeature(featureIndex);
  // const labeledImage = useSelector(feature, (state) => state.context.labeledImage);
  // const cmap = useSelector(feature, (state) => state.context.colormap);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = Array(sh * sw).fill(0);
  }

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  // const background = useSelector(select, (state) => state.context.background);
  const maxLabel = useSelector(select, (state) => Math.max(...Object.keys(state.context.labels)));
  const cmap = useMemo(
    () =>
      colormap({
        colormap: 'viridis',
        nshades: Math.max(9, maxLabel),
        format: 'rgba',
      }),
    [maxLabel]
  );

  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
  }, [width, height]);

  const kernel = useRef();
  const gpuCanvasRef = useRef();

  useEffect(() => {
    const gpu = new GPU();
    kernel.current = gpu
      .createKernel(function (labels, colormap, foreground, highlight, highlightColor, opacity) {
        const n = this.thread.x + this.constants.w * (this.constants.h - this.thread.y);
        const label = labels[n];
        if (highlight && label === foreground && foreground !== 0) {
          const [r, g, b] = highlightColor;
          this.color(r / 255, g / 255, b / 255, opacity);
        } else if (label !== 0) {
          const [r, g, b] = colormap[label - 1];
          this.color(r / 255, g / 255, b / 255, opacity);
        } else {
          this.color(0, 0, 0, opacity);
        }
      })
      .setConstants({ w: sw, h: sh })
      .setOutput([sw, sh])
      .setGraphical(true)
      .setDynamicArguments(true);
    gpuCanvasRef.current = kernel.current.canvas;
  }, [sw, sh]);

  useEffect(() => {
    console.log(labeledArray, cmap, foreground, highlight, highlightColor, opacity);
    kernel.current(labeledArray, cmap, foreground, highlight, highlightColor, opacity);
  }, [labeledArray, cmap, foreground, highlight, opacity]);

  useEffect(() => {
    ctx.current.save();
    ctx.current.clearRect(0, 0, width, height);
    ctx.current.drawImage(gpuCanvasRef.current, sx, sy, sw / zoom, sh / zoom, 0, 0, width, height);
    ctx.current.restore();
  }, [labeledArray, foreground, highlight, opacity, sw, sh, sx, sy, zoom, width, height]);

  return (
    <canvas
      id='labeled-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

export default LabeledCanvas;
