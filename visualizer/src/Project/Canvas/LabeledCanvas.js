import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useImage,
  useLabeled,
  useLabels,
  useLineage,
  useSelect,
} from '../ProjectContext';

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.opacity);

  const labels = useLabels();
  const colormap = useSelector(labels, (state) => state.context.colormap);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeledArrays && state.context.labeledArrays[feature][frame]
  );

  // Get all selected labels
  const lineage = useLineage();
  const lineageLabel = useSelector(lineage, (state) => state.context.selected);
  const select = useSelect();
  const selectLabel = useSelector(select, (state) => state.context.foreground);
  const label = process.env.REACT_APP_CALIBAN_VISUALIZER === 'true' ? lineageLabel : selectLabel;

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (labelArray, colormap, highlightedLabel, highlight, highlightColor, opacity) {
        const label = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        if (highlight && label === highlightedLabel && highlightedLabel !== 0) {
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
  }, [width, height, kernelCanvas]);

  useEffect(() => {
    if (labeledArray) {
      // Compute the label image with the kernel
      kernelRef.current(labeledArray, colormap, label, highlight, highlightColor, opacity);
      // Rerender the parent canvas with the kernel output
      setCanvases((canvases) => ({ ...canvases, labeled: kernelCanvas }));
    }
  }, [labeledArray, colormap, label, highlight, opacity, kernelCanvas, setCanvases]);

  return null;
};

export default LabeledCanvas;
