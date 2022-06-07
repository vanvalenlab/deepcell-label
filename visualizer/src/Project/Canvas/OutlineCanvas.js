import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useCells,
  useChannel,
  useImage,
  useLabeled,
  useRaw,
  useSelectedCell,
} from '../ProjectContext';

const OutlineCanvas = ({ setBitmaps }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const cell = useSelectedCell();

  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.outlineOpacity);
  const feature = useSelector(labeled, (state) => state.context.feature);

  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);
  const channelIndex = useSelector(raw, (state) => state.context.channel);
  const channel = useChannel(channelIndex);
  const invert = useSelector(channel, (state) => state.context.invert && isGrayscale);

  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeled && state.context.labeled[feature][t]
  );

  const cells = useCells();
  const cellMatrix = useSelector(cells, (state) => state.context.cells?.getMatrix(t), equal);

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (data, cells, numLabels, opacity, cell, invert) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        let north = value;
        let south = value;
        let east = value;
        let west = value;
        if (x !== 0) {
          north = data[y][x - 1];
        }
        if (x !== this.constants.w - 1) {
          south = data[y][x + 1];
        }
        if (y !== 0) {
          west = data[y - 1][x];
        }
        if (y !== this.constants.h - 1) {
          east = data[y + 1][x];
        }
        let outlineOpacity = 1;
        for (let i = 0; i < numLabels; i++) {
          if (cells[value][i] === 1) {
            if (cells[north][i] === 0 || cells[south][i] === 0 || cells[west][i] === 0 || cells[east][i] === 0)
           {
              if (cell === i) {
                outlineOpacity = outlineOpacity * (1 - opacity[1]);
              } else {
                outlineOpacity = outlineOpacity * (1 - opacity[0]);
              }
            }
          }
        }
        let [r, g, b] = [1, 1, 1];
        if (invert) {
          r = 0;
          g = 0;
          b = 0;
        }
        this.color(r, g, b, 1 - outlineOpacity);
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
  }, [kernelCanvas, width, height]);

  useEffect(() => {
    if (labeledArray && cellMatrix) {
      const numLabels = cellMatrix[0].length;
      // Compute the outline of the labels with the kernel
      kernelRef.current(labeledArray, cellMatrix, numLabels, [opacity, opacity], cell, invert);
      // Rerender the parent canvas
      createImageBitmap(kernelCanvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, outline: bitmap }));
      });
    }
  }, [labeledArray, cellMatrix, opacity, cell, invert, setBitmaps, kernelCanvas, width, height]);

  return null;
};

export default OutlineCanvas;
