/*
 * Canvas used to render cell type interior label colors
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

  const cellTypes = useCellTypes();
  const colorMap = useSelector(cellTypes, (state) => state.context.colorMap);

  const { mapping, lengths } = useCellValueMapping();

  const gpu = useAlphaGpu();
  const kernelRef = useRef();

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, mapping, lengths, colorMap) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        let [r, g, b, a] = [0, 0, 0, 1];

        const numCells = lengths[value];
        for (let i = 0; i < numCells; i++) {
          let [sr, sg, sb, sa] = [0, 0, 0, 1];
          const currCell = mapping[value][i];

          // If the cell has a color mapping, use it
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
          }
        }
        this.color(r, g, b, 1 - a);
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
      kernel(labeledArray, mapping, lengths, colorMap);
      // Rerender the parent canvas
      createImageBitmap(kernel.canvas).then((bitmap) => {
        setBitmaps((bitmaps) => ({ ...bitmaps, types: bitmap }));
      });
    }
  }, [labeledArray, mapping, lengths, colorMap, setBitmaps, width, height]);

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
