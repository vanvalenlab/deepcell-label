/*
 * Canvas that renders the interior labels of cells based on a color map
 */
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useCanvas,
  useCellValueMapping,
  useColormap,
  useLabeled,
  useLabeledArray,
  useLabelMode,
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
  const { mapping, lengths } = useCellValueMapping();
  const colormap = useColormap();
  const cell = useSelectedCell();

  const labelMode = useLabelMode();
  const cellTypes = useSelector(labelMode, (state) => state.matches('editCellTypes'));

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = cellTypes
      ? // Set entire layer to transparent if on cell types tab
        gpu.createKernel(
          `function (
            labeledArray,
            mapping,
            lengths,
            opacity,
            colormap,
            cell,
            highlight,
            highlightColor)
          {
            this.color(1, 1, 1, 0);
          }`,
          {
            constants: { w: width, h: height },
            output: [width, height],
            graphical: true,
            dynamicArguments: true,
          }
        )
      : /*
         * Otherwise, render the normal labeled layer
         * Mix all mapped colors at 'opacity' for each cell that the pixel maps to
         */
        gpu.createKernel(
          `function (labeledArray, mapping, lengths, opacity, colormap, cell, highlight, highlightColor) {
            const value = labeledArray[this.constants.h - 1 - this.thread.y][this.thread.x];
            let [r, g, b, a] = [0, 0, 0, 1];
            const numCells = lengths[value];
            if (value > 0 && mapping[value][0] !== 0) {
              for (let i = 0; i < numCells; i++) {
                const currCell = mapping[value][i];
                let [sr, sg, sb, sa] = [0, 0, 0, 1];
                if (currCell === cell && highlight) {
                  sr = highlightColor[0];
                  sg = highlightColor[1];
                  sb = highlightColor[2];
                } else {
                  sr = colormap[currCell][0];
                  sg = colormap[currCell][1];
                  sb = colormap[currCell][2];
                }
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
  }, [gpu, cellTypes, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    if (labeledArray && mapping && lengths) {
      // Compute the label image with the kernel
      kernel(labeledArray, mapping, lengths, opacity, colormap, cell, highlight, highlightColor);
      // Rerender with the new bitmap
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, labeled: bitmap }));
      });
    }
  }, [
    labeledArray,
    mapping,
    lengths,
    opacity,
    colormap,
    cell,
    highlight,
    setBitmaps,
    cellTypes,
    width,
    height,
  ]);

  return null;
};

export default LabeledCanvas;
