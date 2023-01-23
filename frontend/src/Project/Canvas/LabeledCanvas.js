import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useCanvas,
  useColormap,
  useLabeled,
  useLabeledArray,
  useOverlaps,
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
  const { overlaps, numCells, maxCell } = useOverlaps();
  const colormap = useColormap();
  const cell = useSelectedCell();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (labelArray, overlaps, numCells, maxCell, opacity, colormap, cell, highlight, highlightColor) {
        const value = labelArray[this.constants.h - 1 - this.thread.y][this.thread.x];
        let [r, g, b, a] = [0, 0, 0, 0];
        if (value !== 0) {
          a = opacity;
        }
        if (value === cell && highlight) {
          r = highlightColor[0];
          g = highlightColor[1];
          b = highlightColor[2];
        }
        // There should be no overlaps, just use map
        else if (value <= maxCell) {
          r = colormap[value][0] / 255;
          g = colormap[value][1] / 255;
          b = colormap[value][2] / 255;
        }
        // Overlap detected
        else {
          a = 1;
          const numOverlapping = numCells[value - maxCell - 1];

          // Mix each of the cell colors for all cells in overlap
          for (let i = 0; i < numOverlapping; i++) {
            const currCell = overlaps[value - maxCell - 1][i];
            a = a * (1 - opacity);
            let sr = colormap[currCell][0] * opacity / 255;
            let sg = colormap[currCell][1] * opacity / 255;
            let sb = colormap[currCell][2] * opacity / 255;
            
            // If highlighting a cell with overlaps also mix highlight color
            if (cell === currCell && highlight) {
              sr = highlightColor[0] * opacity / 255;
              sg = highlightColor[1] * opacity / 255;
              sb = highlightColor[2] * opacity / 255;
            }
            r = r + sr - r * sr;
            g = g + sg - g * sg;
            b = b + sb - b * sb;
          }
          a = 1 - a;
        }
        this.color(r, g, b, a);
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
    if (labeledArray && overlaps && maxCell) {
      // Compute the label image with the kernel
      kernel(
        labeledArray,
        overlaps,
        numCells,
        maxCell,
        opacity,
        colormap,
        cell,
        highlight,
        highlightColor
      );
      // Rerender with the new bitmap
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, labeled: bitmap }));
      });
    }
  }, [labeledArray, overlaps, maxCell, opacity, colormap, cell, highlight, setBitmaps, width, height]);

  return null;
};

export default LabeledCanvas;
