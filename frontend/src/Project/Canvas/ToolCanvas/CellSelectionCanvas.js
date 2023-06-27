// Canvas when selecting multiple cells
import { useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import {
  useAlphaGpu,
  useArrays,
  useCanvas,
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

  const [kernel1Value, setKernel1Value] = useState();
  const [kernel2Value, setKernel2Value] = useState();
  const [isLitUp, setisLitUp] = useState(true);

  useEffect(() => {
    const kernel = gpu.createKernel(
      `function (data, numSelected, selected, light) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const value = data[y][x];
        const north = x !== 0 ? data[y][x - 1] : value;
        const south = x !== this.constants.w - 1 ? data[y][x + 1] : value;
        const west = y !== 0 ? data[y - 1][x] : value;
        const east = y !== this.constants.h - 1 ? data[y + 1][x] : value;
        // Increase outline width to 2 pixels
        const nnorth = x > 1 ? data[y][x - 2] : value;
        const ssouth = x < this.constants.w - 2 ? data[y][x + 2] : value;
        const wwest = y > 1 ? data[y - 2][x] : value;
        const eeast = y < this.constants.h - 2 ? data[y + 2][x] : value;

        // Outline selected cells on plot
        for (let i = 0; i < numSelected; i++) {
          const cell = selected[i];
          if (north !== value || south !== value || east !== value || west !== value
              || nnorth !== value || ssouth !== value || eeast !== value || wwest !== value) {
            if (cell === value && value > 0) {
              this.color(1, 1, 1, 1);
            }
          }
          // Light up highlighted cells
          else if (cell === value && value > 0 && light) {
            this.color(1, 1, 1, 0.5);
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

    async function bitmapSetter1(labeledArray, selected, kernel) {
      kernel(labeledArray, selected.length, selected, true);
      const bitmap1 = await createImageBitmap(kernel.canvas);
      setKernel1Value(bitmap1);
    }

    async function bitmapSetter2(labeledArray, selected, kernel) {
      kernel(labeledArray, selected.length, selected, false);
      const bitmap2 = await createImageBitmap(kernel.canvas);
      setKernel2Value(bitmap2);
    }

    // Calculate the actual bitmap values to store
    if (labeledArray && selected && selected.length > 0) {
      bitmapSetter1(labeledArray, selected, kernel);
      bitmapSetter2(labeledArray, selected, kernel);
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
