import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import {
  useAlphaKernelCanvas,
  useArrays,
  useCanvas,
  useImage,
  useLabeled,
  useOverlaps,
  useSelect,
} from '../ProjectContext';

const OutlineCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const select = useSelect();
  const selected = useSelector(select, (state) => state.context.selected);

  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.outlineOpacity);
  const feature = useSelector(labeled, (state) => state.context.feature);

  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    (state) => state.context.labeledArrays && state.context.labeledArrays[feature][frame]
  );

  const overlaps = useOverlaps();
  const overlapsArray = useSelector(overlaps, (state) => state.context.overlaps);

  const kernelRef = useRef();
  const kernelCanvas = useAlphaKernelCanvas();

  useEffect(() => {
    const gpu = new GPU({ canvas: kernelCanvas });
    const kernel = gpu.createKernel(
      `function (data, overlaps, numLabels, opacity, selected) {
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
          if (overlaps[value][i] === 1) {
            if (overlaps[north][i] === 0 || overlaps[south][i] === 0 || overlaps[west][i] === 0 || overlaps[east][i] === 0)
           {
              if (selected === i) {
                outlineOpacity = outlineOpacity * (1 - opacity[1]);
              } else {
                outlineOpacity = outlineOpacity * (1 - opacity[0]);
              }
            }
          }
        }
        this.color(1, 1, 1, 1 - outlineOpacity);
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
    if (labeledArray && overlapsArray) {
      const numLabels = overlapsArray[0].length;
      // Compute the outline of the labels with the kernel
      kernelRef.current(labeledArray, overlapsArray, numLabels, opacity, selected);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, outline: kernelCanvas }));
    }
  }, [labeledArray, overlapsArray, opacity, selected, setCanvases, kernelCanvas, width, height]);

  return null;
};

export default OutlineCanvas;
