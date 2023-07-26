/*
 * Canvas that renders the cell type outline colors around cells
 */
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellTypes,
  useCellValueMapping,
  useImage,
  useLabeled,
  useSelectedCell,
} from '../../ProjectContext';

function CellTypeOutlineCanvas({ setBitmaps }) {
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

  const { mapping, lengths } = useCellValueMapping();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  /*
   * Render the pixel as a cell's mapped color (or mix of multiple cells') if
   * (1) The pixel maps to that cell
   * (2) The pixel is adjacent to a pixel that *doesn't* map to that cell
   */
  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, cell, mapping, lengths, colorMap) {
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
        const numCells = lengths[value];
        let selected = false;

        if (value > 0 && mapping[value][0] !== 0) {
          for (let i = 0; i < numCells; i++) {
            let [sr, sg, sb, sa] = [0, 0, 0, 1];
            const currCell = mapping[value][i];
            let isOutline = 0;
            const numNorth = lengths[north];
            const numSouth = lengths[south];
            const numWest = lengths[west];
            const numEast = lengths[east];
            // Check if north pixel contains current cell or not
            for (let j = 0; j < numNorth; j++) {
              const northCell = mapping[north][j];
              if (northCell !== currCell) {
                isOutline = isOutline + 1;
              }
            }
            if (isOutline === numNorth) {
              if (currCell === cell) {
                this.color(1, 1, 1, 1);
                selected = true;
                break;
              } else if (colorMap[currCell][3] !== 0) {
                sr = colorMap[currCell][0];
                sg = colorMap[currCell][1];
                sb = colorMap[currCell][2];
                r = r + sr - r * sr;
                g = g + sg - g * sg;
                b = b + sb - b * sb;
                a = 0;
              }
            } else {
              isOutline = 0;
              // Check if south pixel contains current cell or not
              for (let j = 0; j < numSouth; j++) {
                const southCell = mapping[south][j];
                if (southCell !== currCell) {
                  isOutline = isOutline + 1;
                }
              }
              if (isOutline === numSouth) {
                if (currCell === cell) {
                  this.color(1, 1, 1, 1);
                  selected = true;
                  break;
                } else if (colorMap[currCell][3] !== 0) {
                  sr = colorMap[currCell][0];
                  sg = colorMap[currCell][1];
                  sb = colorMap[currCell][2];
                  r = r + sr - r * sr;
                  g = g + sg - g * sg;
                  b = b + sb - b * sb;
                  a = 0;
                }
              } else {
                isOutline = 0;
                // Check if west pixel contains current cell or not
                for (let j = 0; j < numWest; j++) {
                  const westCell = mapping[west][j];
                  if (westCell !== currCell) {
                    isOutline = isOutline + 1;
                  }
                }
                if (isOutline === numWest) {
                  if (currCell === cell) {
                    this.color(1, 1, 1, 1);
                    selected = true;
                    break;
                  } else if (colorMap[currCell][3] !== 0) {
                    sr = colorMap[currCell][0];
                    sg = colorMap[currCell][1];
                    sb = colorMap[currCell][2];
                    r = r + sr - r * sr;
                    g = g + sg - g * sg;
                    b = b + sb - b * sb;
                    a = 0;
                  }
                } else {
                  isOutline = 0;
                  // Check if east pixel contains current cell or not
                  for (let j = 0; j < numEast; j++) {
                    const eastCell = mapping[east][j];
                    if (eastCell !== currCell) {
                      isOutline = isOutline + 1;
                    }
                  }
                  if (isOutline === numEast) {
                    if (currCell === cell) {
                      this.color(1, 1, 1, 1);
                      selected = true;
                      break;
                    } else if (colorMap[currCell][3] !== 0) {
                      sr = colorMap[currCell][0];
                      sg = colorMap[currCell][1];
                      sb = colorMap[currCell][2];
                      r = r + sr - r * sr;
                      g = g + sg - g * sg;
                      b = b + sb - b * sb;
                      a = 0;
                    }
                  }
                }
              }
            }
          }
        }
        if (!selected) {
          this.color(r, g, b, 1 - a);
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
      kernel(labeledArray, cell, mapping, lengths, colorMap);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, typeOutlines: bitmap }));
      });
    }
  }, [labeledArray, cell, mapping, lengths, colorMap, setBitmaps, width, height]);

  useEffect(
    () => () =>
      setBitmaps((bitmaps) => {
        const { typeOutlines, ...rest } = bitmaps;
        return rest;
      }),
    [setBitmaps]
  );

  return null;
}

export default CellTypeOutlineCanvas;
