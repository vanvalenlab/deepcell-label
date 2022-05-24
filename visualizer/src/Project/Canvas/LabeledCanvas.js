import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useImage,
  useLabeled,
  useOverlaps,
  useSelectedCell,
} from '../ProjectContext';

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.labelsOpacity);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeled && state.context.labeled[feature][frame]
  );

  const overlaps = useOverlaps();
  const overlapsMatrix = useSelector(
    overlaps,
    (state) => state.context.overlaps?.getMatrix(frame),
    equal
  );
  const colormap = useSelector(overlaps, (state) => state.context.colormap);

  const cell = useSelectedCell();

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (labelArray, overlapsMatrix, opacity, colormap, cell, numLabels, highlight, highlightColor) {
        const value = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        let [r, g, b, a] = [0, 0, 0, 1];
        for (let i = 0; i < numLabels; i++) {
          if (overlapsMatrix[value][i] === 1) {
            let [sr, sg, sb] = [0, 0, 0];
            if (i === cell && highlight) {
              sr = highlightColor[0];
              sg = highlightColor[1];
              sb = highlightColor[2];
            } else {
              sr = colormap[i][0];
              sg = colormap[i][1];
              sb = colormap[i][2];
            }

            if (i !== cell) {
              a = a * (1 - opacity[0]);
              sr = opacity[0] * sr / 255;
              sg = opacity[0] * sg / 255;
              sb = opacity[0] * sb / 255;
            } else {

              a = a * (1 - opacity[1]);
              sr = opacity[1] * sr / 255;
              sg = opacity[1] * sg / 255;
              sb = opacity[1] * sb / 255;
            }
            r = r + sr - r * sr;
            g = g + sg - g * sg;
            b = b + sb - b * sb;
          }
        }
        this.color(r, g, b, 1 - a);
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
    if (labeledArray && overlapsMatrix) {
      const numLabels = overlapsMatrix[0].length;
      // Compute the label image with the kernel
      kernelRef.current(
        labeledArray,
        overlapsMatrix,
        opacity,
        colormap,
        cell,
        numLabels,
        highlight,
        highlightColor
      );
      // Rerender the parent canvas with the kernel output
      setCanvases((canvases) => ({ ...canvases, labeled: kernelCanvas }));
    }
  }, [
    labeledArray,
    overlapsMatrix,
    opacity,
    colormap,
    cell,
    highlight,
    kernelCanvas,
    setCanvases,
    width,
    height,
  ]);

  return null;
};

export default LabeledCanvas;
