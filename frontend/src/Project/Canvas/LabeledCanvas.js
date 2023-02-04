import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useCanvas,
  useCellsAtTime,
  useColormap,
  useLabeled,
  useLabeledArray,
  useReducedCellMatrix,
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
  const cellsList = useCellsAtTime();
  const { cellMatrix, minCell, minValue } = useReducedCellMatrix();
  const colormap = useColormap();
  const cell = useSelectedCell();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (labelArray, cellMatrix, minCell, minValue, cellsList, opacity, colormap, cell, numValues, numLabels, highlight, highlightColor) {
        const value = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        let [r, g, b, a] = [0, 0, 0, 1];
        if (value - minValue < numValues && value >= minValue) {
          for (let i = 0; i < numLabels; i++) {
            const currCell = cellsList[i];
            if (cellMatrix[value - minValue][currCell - minCell] === 1) {
              let [sr, sg, sb] = [0, 0, 0];
              if (currCell === cell && highlight) {
                sr = highlightColor[0];
                sg = highlightColor[1];
                sb = highlightColor[2];
              } else {
                sr = colormap[currCell][0];
                sg = colormap[currCell][1];
                sb = colormap[currCell][2];
              }

              let sa = 1;
              // Only use mixing if overlap
              if (a < 1) {
                sa = opacity;
              }
              a = a * (1 - opacity);
              sr = sa * sr / 255;
              sg = sa * sg / 255;
              sb = sa * sb / 255;

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
        loopMaxIterations: 5000, // Maximum number of cell labels to render
      }
    );
    kernelRef.current = kernel;
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    if (labeledArray && cellMatrix && cellsList.length > 0) {
      const numLabels = cellsList.length;
      const numValues = cellMatrix.length;
      // Compute the label image with the kernel
      kernel(
        labeledArray,
        cellMatrix,
        minCell,
        minValue,
        cellsList,
        opacity,
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
  }, [
    labeledArray,
    cellMatrix,
    cellsList,
    minCell,
    minValue,
    opacity,
    colormap,
    cell,
    highlight,
    setBitmaps,
    width,
    height,
  ]);

  return null;
};

export default LabeledCanvas;
