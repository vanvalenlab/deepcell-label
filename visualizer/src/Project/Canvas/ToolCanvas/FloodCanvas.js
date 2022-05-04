import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useFlood,
  useImage,
  useLabeled,
  useOverlaps,
} from '../../ProjectContext';

const FloodCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);

  const flood = useFlood();
  const label = useSelector(flood, (state) => state.context.floodedLabel);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeledArrays && state.context.labeledArrays[feature][frame]
  );

  const overlaps = useOverlaps();
  const overlapsArray = useSelector(overlaps, (state) => state.context.overlaps[feature][frame]);

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (data, overlaps, label) {
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
        if (overlaps[value][label] === 1) {
          if (overlaps[north][label] === 0 || overlaps[south][label] === 0 || overlaps[west][label] === 0 || overlaps[east][label] === 0) {
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
    if (labeledArray) {
      kernelRef.current(labeledArray, overlapsArray, label);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, tool: kernelCanvas }));
    }
  }, [labeledArray, overlapsArray, label, setCanvases, kernelCanvas, width, height]);

  return null;
};

export default FloodCanvas;
