import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useCanvas,
  useCellMatrix,
  useColormap,
  useLabeled,
  useLabeledArray,
  useSelectedCell,
} from '../ProjectContext';

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.cellsOpacity);

  const labeledArray = useLabeledArray();
  const cellMatrix = useCellMatrix();
  const colormap = useColormap();
  const cell = useSelectedCell();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (labelArray, cellMatrix, opacity, colormap, cell, numValues, numLabels, highlight, highlightColor) {
        const value = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        let [r, g, b, a] = [0, 0, 0, 1];
        if (value < numValues) {
          for (let i = 0; i < numLabels; i++) {
            if (cellMatrix[value][i] === 1) {
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
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    if (labeledArray && cellMatrix) {
      const numLabels = cellMatrix[0].length;
      const numValues = cellMatrix.length;
      // Compute the label image with the kernel
      kernel(
        labeledArray,
        cellMatrix,
        [opacity, opacity],
        colormap,
        cell,
        numValues,
        numLabels,
        highlight,
        highlightColor
      );
      // Rerender with the new bitmap
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, labeled: bitmap }));
      });
    }
  }, [labeledArray, cellMatrix, opacity, colormap, cell, highlight, setBitmaps, width, height]);

  return null;
};

export default LabeledCanvas;
