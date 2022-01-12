import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useFeature, useLabeled, useSelect } from '../../ProjectContext';

const OutlineCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  const background = useSelector(select, (state) => state.context.background);

  const labeled = useLabeled();
  const outlineAll = useSelector(labeled, (state) => state.context.outline);
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const feature = useFeature(featureIndex);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = new Array(height).fill(new Array(width).fill(0));
  }

  const kernelRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.getContext('webgl2', { premultipliedAlpha: false });
    const gpu = new GPU({ canvas });
    const kernel = gpu.createKernel(
      function (data, outlineAll, foreground, background) {
        const x = this.thread.x;
        const y = this.constants.h - 1 - this.thread.y;
        const label = data[y][x];
        const onOutline =
          label !== 0 &&
          ((x !== 0 && data[y][x - 1] !== label) ||
            (x !== this.constants.w - 1 && data[y][x + 1] !== label) ||
            (y !== 0 && data[y - 1][x] !== label) ||
            (y !== this.constants.h - 1 && data[y + 1][x] !== label));

        // always outline selected labels
        if (onOutline && label === background) {
          this.color(1, 0, 0, 1);
        } else if (onOutline && label === foreground) {
          this.color(1, 1, 1, 1);
        } else if (label === foreground && foreground !== 0) {
          this.color(1, 1, 1, 0.5);
        } else if (outlineAll && onOutline) {
          this.color(1, 1, 1, 1);
        }
      },
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
      }
    );
    kernelRef.current = kernel;
    return () => {
      kernel.destroy();
      gpu.destroy();
    };
  }, [width, height]);

  useEffect(() => {
    // Rerender the canvas for this component
    kernelRef.current(labeledArray, outlineAll, foreground, background);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, outline: canvasRef.current }));
  }, [labeledArray, outlineAll, foreground, background, setCanvases]);

  return <canvas hidden={true} id={'outline-canvas'} ref={canvasRef} />;
};

export default OutlineCanvas;
