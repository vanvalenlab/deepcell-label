/*
 * Canvas that renders selection of multiple cells (from plot / highlight multi-labels)
 */
import { useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
  useCellValueMapping,
  useEditCellTypes,
  useImage,
  useLabeled,
} from '../../ProjectContext';

function CellSelectionCanvas({ setBitmaps }) {
  const canvas = useCanvas();
  const enableAnimations = useSelector(canvas, (state) => state.context.enableAnimations);
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

  const gpu = useAlphaGpu();

  const { mapping, lengths } = useCellValueMapping();

  const [kernel1Value, setKernel1Value] = useState();
  const [kernel2Value, setKernel2Value] = useState();
  const [isLitUp, setisLitUp] = useState(true);

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, mapping, lengths, numSelected, selected, light) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        const numCells = lengths[value];
        const north = x !== 0 ? data[y][x - 1] : value;
        const south = x !== this.constants.w - 1 ? data[y][x + 1] : value;
        const west = y !== 0 ? data[y - 1][x] : value;
        const east = y !== this.constants.h - 1 ? data[y + 1][x] : value;
        const numNorth = lengths[north];
        const numSouth = lengths[south];
        const numWest = lengths[west];
        const numEast = lengths[east];

        for (let i = 0; i < numSelected; i++) {
          const cell = selected[i];
          let label = false;
          for (let j = 0; j < numCells; j++) {
            // If the pixel maps to a selected cell and we are lighting up, color it
            if (cell === mapping[value][j]) {
              if (light) {
                this.color(1, 1, 1, 0.5);
              }
              label = true;     // We have found that it maps to a label, so stop searching
              break;
            }
          }
          if (label) {
            break;
          }
          // Otherwise, check if the pixel is adjacent to a selected cell for outer outline
          else {
            let isOutline = 0;
            for (let j = 0; j < numNorth; j++) {
              if (cell === mapping[north][j]) {
                isOutline = isOutline + 1;
              }
            }
            if (isOutline === numNorth) {
              this.color(1, 1, 1, 1);
              break;
            } else {
              isOutline = 0;
              for (let j = 0; j < numSouth; j++) {
                if (cell === mapping[south][j]) {
                  isOutline = isOutline + 1;
                }
              }
              if (isOutline === numSouth) {
                this.color(1, 1, 1, 1);
                break;
              } else {
                isOutline = 0;
                for (let j = 0; j < numWest; j++) {
                  if (cell === mapping[west][j]) {
                    isOutline = isOutline + 1;
                  }
                }
                if (isOutline === numWest) {
                  this.color(1, 1, 1, 1);
                  break;
                } else {
                  isOutline = 0;
                  for (let j = 0; j < numEast; j++) {
                    if (cell === mapping[east][j]) {
                      isOutline = isOutline + 1;
                    }
                  }
                  if (isOutline === numEast) {
                    this.color(1, 1, 1, 1);
                    break;
                  }
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

    async function bitmapSetter1(labeledArray, mapping, lengths, selected, kernel) {
      kernel(labeledArray, mapping, lengths, selected.length, selected, true);
      const bitmap1 = await createImageBitmap(kernel.canvas);
      setKernel1Value(bitmap1);
    }

    async function bitmapSetter2(labeledArray, mapping, lengths, selected, kernel) {
      kernel(labeledArray, mapping, lengths, selected.length, selected, false);
      const bitmap2 = await createImageBitmap(kernel.canvas);
      setKernel2Value(bitmap2);
    }

    // Calculate the actual bitmap values to store
    if (labeledArray && selected && selected.length > 0) {
      bitmapSetter1(labeledArray, mapping, lengths, selected, kernel);
      bitmapSetter2(labeledArray, mapping, lengths, selected, kernel);
    } else {
      setKernel1Value(null);
      setKernel2Value(null);
    }
  }, [gpu, labeledArray, selected, width, height]);

  // Move the animation between frames if enabled
  useEffect(() => {
    let intervalId;
    if (selected && selected.length > 0 && enableAnimations) {
      intervalId = setInterval(() => {
        setisLitUp((isLitUp) => !isLitUp);
      }, 1000);
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [enableAnimations, isLitUp, selected]);

  useEffect(() => {
    // Alternate between two kernel values if animations enabled
    const kernelValue = isLitUp || !enableAnimations ? kernel1Value : kernel2Value;

    if (kernelValue) {
      // Rerender the parent canvas
      setBitmaps((bitmaps) => ({ ...bitmaps, selections: kernelValue }));
    } else {
      // Remove the bitmap from the parent canvas
      setBitmaps((bitmaps) => {
        const { selections, ...rest } = bitmaps;
        return rest;
      });
    }
  }, [isLitUp, enableAnimations, setBitmaps, kernel1Value, kernel2Value]);

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
