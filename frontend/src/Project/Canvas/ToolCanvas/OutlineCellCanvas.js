/*
 * Canvas that renders a colored (namely white) outline of a selected cell
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

function OutlineCellCanvas({ setBitmaps, cell, color }) {
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
   * Color the pixel with 'color' if both are true:
   * (1) the pixel value maps to 'cell'
   * (2) the pixel is adjacent to a pixel that *doesn't* map to 'cell'
   */
  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, mapping, lengths, cell, color) {
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
        const [r, g, b, a] = color;

        const numCells = lengths[value];
        for (let i = 0; i < numCells; i++) {
          let outline = 0;
          const currCell = mapping[value][i];
          const numNorth = lengths[north];
          for (let j = 0; j < numNorth; j++) {
            const northCell = mapping[north][j];
            if (northCell !== cell) {
              outline += 1;
            }
          }
          if (outline === numNorth && currCell === cell) {
            this.color(r, g, b, a);
            break;
          } else {
            outline = 0;
            const numSouth = lengths[south];
            for (let j = 0; j < numSouth; j++) {
              const southCell = mapping[south][j];
              if (southCell !== cell) {
                outline += 1;
              }
            }
            if (outline === numSouth && currCell === cell) {
              this.color(r, g, b, a);
              break;
            } else {
              outline = 0;
              const numWest = lengths[west];
              for (let j = 0; j < numWest; j++) {
                const westCell = mapping[west][j];
                if (westCell !== cell) {
                  outline += 1;
                }
              }
              if (outline === numWest && currCell === cell) {
                this.color(r, g, b, a);
                break;
              } else {
                outline = 0;
                const numEast = lengths[east];
                for (let j = 0; j < numEast; j++) {
                  const eastCell = mapping[east][j];
                  if (eastCell !== cell) {
                    outline += 1;
                  }
                }
                if (outline === numEast && currCell === cell) {
                  this.color(r, g, b, a);
                  break;
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
      }
    );
    kernelRef.current = kernel;
  }, [gpu, width, height]);

  useEffect(() => {
    const kernel = kernelRef.current;
    // TODO: Find way to optimize when selected cell not in frame?
    // Cell beyond the cell matrix, so it's not in the frame
    // if (cell && cell > cellMatrix[0].length) {
    //   // Remove the tool canvas
    //   setBitmaps((bitmaps) => {
    //     const { tool, ...rest } = bitmaps;
    //     return rest;
    //   });
    if (cell && mapping && lengths) {
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

export default OutlineCellCanvas;
