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
} from '../../ProjectContext';

function OutlineCellCanvas({ setCanvases, cell }) {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);

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

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (data, overlaps, cell) {
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
        if (overlaps[value][cell] === 1) {
          if (overlaps[north][cell] === 0 || overlaps[south][cell] === 0 || overlaps[west][cell] === 0 || overlaps[east][cell] === 0) {
            this.color(1, 0, 0, 1);
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
    if (labeledArray && overlapsMatrix) {
      kernelRef.current(labeledArray, overlapsMatrix, cell);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, tool: kernelCanvas }));
    }
  }, [labeledArray, overlapsMatrix, cell, setCanvases, kernelCanvas, width, height]);

  return null;
}

export default OutlineCellCanvas;
