import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellMatrix,
  useImage,
  useLabeled,
} from '../../ProjectContext';

function OuterOutlineCanvas({ setBitmaps, cell, color }) {
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

  const cellMatrix = useCellMatrix();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, cells, cell, color) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        let north = 0;
        let south = 0;
        let east = 0;
        let west = 0;
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
        if (cells[value][cell] === 0) {
          if (cells[north][cell] === 1 || cells[south][cell] === 1 || cells[west][cell] === 1 || cells[east][cell] === 1) {
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
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    // Cell beyond the cell matrix, so it's not in the frame
    if (cell > cellMatrix[0].length) {
      // Remove the tool canvas
      setBitmaps((bitmaps) => {
        const { tool, ...rest } = bitmaps;
        return rest;
      });
    } else if (labeledArray && cellMatrix) {
      kernel(labeledArray, cellMatrix, cell, color);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, tool: bitmap }));
      });
    }
  }, [labeledArray, cellMatrix, cell, color, setBitmaps, width, height]);

  useEffect(
    () => () =>
      setBitmaps((bitmaps) => {
        const { tool, ...rest } = bitmaps;
        return rest;
      }),
    [setBitmaps]
  );

  return null;
}

export default OuterOutlineCanvas;
