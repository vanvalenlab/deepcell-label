import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import React, { useEffect, useRef } from 'react';
import { useCanvas, useFeature, useLabeled, useSelect } from '../../ProjectContext';

const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const red = [255, 0, 0, 255];

const OutlineCanvas = ({ className }) => {
  const canvas = useCanvas();
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const scale = useSelector(canvas, (state) => state.context.scale);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  const background = useSelector(select, (state) => state.context.background);

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const feature = useFeature(featureIndex);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = Array(sh * sw).fill(0);
  }

  const canvasRef = useRef();
  const ctx = useRef();

  useEffect(() => {
    ctx.current = canvasRef.current.getContext('2d');
    ctx.current.imageSmoothingEnabled = false;
    ctx.current.globalAlpha = 0.5;
  }, [width, height]);

  const kernel = useRef();
  const gpuCanvasRef = useRef();

  useEffect(() => {
    const gpu = new GPU();
    kernel.current = gpu
      .createKernel(function (data, foreground, background) {
        const n = this.thread.x + this.constants.w * (this.constants.h - this.thread.y);
        const label = data[n];
        const outline =
          label !== 0 &&
          ((this.thread.x !== 0 && data[n - 1] !== label) ||
            (this.thread.x !== this.constants.w - 1 && data[n + 1] !== label) ||
            (this.thread.y !== 0 && data[n - this.constants.w] !== label) ||
            (this.thread.y !== this.constants.h - 1 && data[n + this.constants.w] !== label));
        if (label === foreground && foreground !== 0) {
          this.color(1, 1, 1, 0.5);
        } else if (outline && label === background) {
          this.color(1, 0, 0, 1);
        } else if (outline) {
          this.color(1, 1, 1, 1);
        } else {
          this.color(0, 0, 0, 0);
        }
      })
      .setConstants({ w: sw, h: sh })
      .setOutput([sw, sh])
      .setGraphical(true);
    gpuCanvasRef.current = kernel.current.canvas;
  }, [sw, sh]);

  useEffect(() => {
    kernel.current(labeledArray, foreground, background);
  }, [labeledArray, foreground, background]);

  useEffect(() => {
    if (gpuCanvasRef.current) {
      ctx.current.save();
      ctx.current.clearRect(0, 0, width, height);
      ctx.current.drawImage(
        gpuCanvasRef.current,
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
    }
  }, [labeledArray, foreground, background, sw, sh, sx, sy, zoom, width, height]);

  return (
    <canvas
      id='outline-canvas'
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

export default OutlineCanvas;
