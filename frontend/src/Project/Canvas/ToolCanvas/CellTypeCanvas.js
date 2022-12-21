// Canvas when visualizing cell types
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellsAtTime,
  useCellTypes,
  useImage,
  useLabeled,
  useReducedCellMatrix,
  useSelectedCell,
} from '../../ProjectContext';

function CellTypeCanvas({ setBitmaps }) {
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

  const cellsList = useCellsAtTime();
  const { cellMatrix, minCell, minValue } = useReducedCellMatrix();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, cell, cells, minCell, minValue, cellsList, numLabels, numValues, colorMap) {
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
        let [r, g, b, a] = [0, 0, 0, 1];
        if (value - minValue < numValues && value >= minValue) {
          for (let i = 0; i < numLabels; i++) {
            const currCell = cellsList[i];
            let [sr, sg, sb, sa] = [0, 0, 0, 0];
            if (cells[value - minValue][currCell - minCell] === 1) {
              if (north === 0 || south === 0 || west === 0 || east === 0
                || cells[north - minValue][currCell - minCell] === 0 || cells[south - minValue][currCell - minCell] === 0
                || cells[west - minValue][currCell - minCell] === 0 || cells[east - minValue][currCell - minCell] === 0
                || north - minValue >= numValues || south - minValue >= numValues
                || west - minValue >= numValues || east - minValue >= numValues)
              {
                if (currCell === cell) {
                  this.color(1, 1, 1, 1);
                }
                else {
                  sr = colorMap[currCell][0];
                  sg = colorMap[currCell][1];
                  sb = colorMap[currCell][2];
                  sa = colorMap[currCell][3];
                  if (sa > 0) {
                    sa = 1;
                  }
                  this.color(sr, sg, sb, sa);
                }
              }
              else {
                if (colorMap[currCell][3] !== 0) {
                  let opacity = 1;
                  sa = colorMap[currCell][3];
                  // Use mixing if overlap exists
                  if (a < 1) {
                    opacity = sa;
                  }
                  sr = opacity * colorMap[currCell][0];
                  sg = opacity * colorMap[currCell][1];
                  sb = opacity * colorMap[currCell][2];
                  r = r + sr - r * sr;
                  g = g + sg - g * sg;
                  b = b + sb - b * sb;
                  a = a * (1 - sa);
                  this.color(r, g, b, 1 - a);
                }
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
    
    if (labeledArray && cellMatrix && cellsList.length > 0) {
      const numLabels = cellsList.length;
      const numValues = cellMatrix.length;
      kernel(labeledArray, cell, cellMatrix, minCell, minValue, cellsList, numLabels, numValues, colorMap);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, types: bitmap }));
      });
    }
  }, [labeledArray, cell, cellMatrix, cellsList, minCell, minValue, colorMap, setBitmaps, width, height]);

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

export default CellTypeCanvas;
