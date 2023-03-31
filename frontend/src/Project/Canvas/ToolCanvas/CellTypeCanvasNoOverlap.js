// Canvas when visualizing cell types
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellTypes,
  useImage,
  useLabeled,
  useSelectedCell,
} from '../../ProjectContext';

function CellTypeCanvasNoOverlap({ setBitmaps }) {
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

  const cell = useSelectedCell();

  const cellTypes = useCellTypes();
  const colorMap = useSelector(cellTypes, (state) => state.context.colorMap);

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, cell, colorMap) {
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

        let [r, g, b, a] = [0, 0, 0, 1];

        if (north !== value || south !== value || east !== value || west !== value) {
          if (value === cell && value > 0) {
            this.color(1, 1, 1, 1);
          }
          else {
            r = colorMap[value][0];
            g = colorMap[value][1];
            b = colorMap[value][2];
            a = colorMap[value][3];
            if (a > 0) {
              a = 1;
            }
            this.color(r, g, b, a);
          }
        }
        else {
          r = colorMap[value][0];
          g = colorMap[value][1];
          b = colorMap[value][2];
          a = colorMap[value][3];
          this.color(r, g, b, a);
        }
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

    if (labeledArray) {
      kernel(labeledArray, cell, colorMap);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, types: bitmap }));
      });
    }
  }, [labeledArray, cell, colorMap, setBitmaps, width, height]);

  useEffect(
    () => () =>
      setBitmaps((bitmaps) => {
        const { types, ...rest } = bitmaps;
        return rest;
      }),
    [setBitmaps]
  );

  return null;
}

export default CellTypeCanvasNoOverlap;
