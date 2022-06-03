import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useCells,
  useImage,
  useLabeled,
} from '../../ProjectContext';

function OutlineCellCanvas({ setCanvases, cell, color }) {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);

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
      `function (data, cells, cell, color) {
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
        if (cells[value][cell] === 1) {
          if (cells[north][cell] === 0 || cells[south][cell] === 0 || cells[west][cell] === 0 || cells[east][cell] === 0) {
            const [r, g, b, a] = color;
            this.color(r, g, b, a);
          }
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
  }, [kernelCanvas, width, height]);

  useEffect(() => {
    // Cell beyond the cell matrix, so it's not in the frame
    if (cell > cellMatrix[0].length) {
      // Remove the tool canvas
      setCanvases((canvases) => {
        const { tool, ...rest } = canvases;
        return rest;
      });
    } else if (labeledArray && cellMatrix) {
      kernelRef.current(labeledArray, cellMatrix, cell, color);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, tool: kernelCanvas }));
    }
  }, [labeledArray, cellMatrix, cell, color, setCanvases, kernelCanvas, width, height]);

  useEffect(
    () => () =>
      setCanvases((canvases) => {
        const { tool, ...rest } = canvases;
        return rest;
      }),
    [setCanvases]
  );

  return null;
}

export default OutlineCellCanvas;
