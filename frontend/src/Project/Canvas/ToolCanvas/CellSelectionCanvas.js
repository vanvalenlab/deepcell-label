// Canvas when selecting multiple cells
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellMatrix,
  useEditCellTypes,
  useImage,
  useLabeled,
} from '../../ProjectContext';

function CellSelectionCanvas({ setBitmaps }) {
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

  const editCellTypes = useEditCellTypes();
  const selected = useSelector(editCellTypes, (state) => state.context.multiSelected);

  const cellMatrix = useCellMatrix();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, cells, numValues, numSelected, selected) {
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

        if (value < numValues) {
          // Outline selected cells on plot
          for (let i = 0; i < numSelected; i++) {
            const cell = selected[i];
            if (cells[value][cell] === 1 && value < numValues) {
              if (cells[north][cell] === 0 || cells[south][cell] === 0 || cells[west][cell] === 0 || cells[east][cell] === 0
                  || north >= numValues || south >= numValues || west >= numValues || east >= numValues) {
                this.color(1, 1, 1, 1);
              }
            }
          }
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
    const numSelected = selected.length;

    if (numSelected > 0) {
      if (labeledArray && cellMatrix) {
        const numValues = cellMatrix.length;
        kernel(labeledArray, cellMatrix, numValues, numSelected, selected);
        // Rerender the parent canvas
        createImageBitmap(kernel.canvas).then((bitmap) => {
          setBitmaps((bitmaps) => ({ ...bitmaps, selections: bitmap }));
        });
      }
    } else {
      // Remove the tool canvas
      setBitmaps((bitmaps) => {
        const { selections, ...rest } = bitmaps;
        return rest;
      });
    }
  }, [labeledArray, cellMatrix, selected, setBitmaps, width, height]);

  useEffect(
    () => () =>
      setBitmaps((bitmaps) => {
        const { selections, ...rest } = bitmaps;
        return rest;
      }),
    [setBitmaps]
  );

  return null;
}

export default CellSelectionCanvas;
