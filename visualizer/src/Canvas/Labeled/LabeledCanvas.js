import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useCanvas,
  useDrawCanvas,
  useFeature,
  useLabeled,
  useSelect,
} from '../../ProjectContext';

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.opacity);

  const feature = useFeature(featureIndex);
  const colormap = useSelector(feature, (state) => state.context.colormap);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = new Array(height).fill(new Array(width).fill(0));
  }

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);

  const kernelRef = useRef();
  const kernelCanvasRef = useAlphaKernelCanvas();
  const drawCanvasRef = useDrawCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvasRef.current });
    const kernel = gpu.createKernel(
      `function (labelArray, colormap, foreground, highlight, highlightColor, opacity) {
        const label = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        if (highlight && label === foreground && foreground !== 0) {
          const [r, g, b] = highlightColor;
          this.color(r / 255, g / 255, b / 255, opacity);
        } else {
          const [r, g, b] = colormap[label];
          this.color(r / 255, g / 255, b / 255, opacity);
        }
      }`,
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
        dynamicArguments: true,
      }
    );
    kernelRef.current = kernel;
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [width, height, kernelCanvasRef]);

  useEffect(() => {
    // Compute the label image with the kernel
    kernelRef.current(labeledArray, colormap, foreground, highlight, highlightColor, opacity);
    // Draw the label image on a separate canvas (needed to reuse webgl output)
    const drawCtx = drawCanvasRef.current.getContext('2d');
    drawCtx.clearRect(0, 0, width, height);
    drawCtx.drawImage(kernelCanvasRef.current, 0, 0);
    // Rerender the parent canvas with the kernel output
    setCanvases((canvases) => ({ ...canvases, labeled: drawCanvasRef.current }));
  }, [
    labeledArray,
    colormap,
    foreground,
    highlight,
    opacity,
    kernelCanvasRef,
    drawCanvasRef,
    setCanvases,
    width,
    height,
  ]);

  return null;
};

export default LabeledCanvas;
