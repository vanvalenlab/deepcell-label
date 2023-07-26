/*
 * Renders an outline around the outside of a specified cell, used for the flood tool.
 */
import { useSelector } from '@xstate/react';
import { useEffect, useRef } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellValueMapping,
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

  const { mapping, lengths } = useCellValueMapping();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  /*
   * Color the pixel if both are true:
   * (1) the pixel value doesn't map to 'cell'
   * (2) the pixel is adjacent to a pixel that *does* map to 'cell'
   */
  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, mapping, lengths, cell, color) {
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

        const numCells = lengths[value];
        let numNotMapped = 0;
        let adjacent = false;

        // Check if the pixel value doesn't map to 'cell'
        for (let i = 0; i < numCells; i++) {
          const currCell = mapping[value][i];
          if (currCell !== cell) {
            numNotMapped += 1;
          }
        }

        // If so, check if the pixel is adjacent to a pixel that does map to 'cell'
        if (numNotMapped === numCells) {
          for (let i = 0; i < numCells; i++) {
            // Check if north cell maps to 'cell'
            const numNorth = lengths[north];
            for (let j = 0; j < numNorth; j++) {
              const northCell = mapping[north][j];
              if (northCell === cell) {
                adjacent = true;
                break;
              }
            }
            if (!adjacent) {
              // Check if south cell maps to 'cell'
              const numSouth = lengths[south];
              for (let j = 0; j < numSouth; j++) {
                const southCell = mapping[south][j];
                if (southCell === cell) {
                  adjacent = true;
                  break;
                }
              }
              if (!adjacent) {
                // Check if west cell maps to 'cell'
                const numWest = lengths[west];
                for (let j = 0; j < numWest; j++) {
                  const westCell = mapping[west][j];
                  if (westCell === cell) {
                    adjacent = true;
                    break;
                  }
                }
                if (!adjacent) {
                  // Check if east cell maps to 'cell'
                  const numEast = lengths[east];
                  for (let j = 0; j < numEast; j++) {
                    const eastCell = mapping[east][j];
                    if (eastCell === cell) {
                      adjacent = true;
                      break;
                    }
                  }
                }
              }
            }
          }
          // Color pixel if conditions are met
          if (adjacent) {
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
    if (mapping && lengths) {
      kernel(labeledArray, mapping, lengths, cell, color);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, tool: bitmap }));
      });
    }
  }, [labeledArray, mapping, lengths, cell, color, setBitmaps, width, height]);

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
