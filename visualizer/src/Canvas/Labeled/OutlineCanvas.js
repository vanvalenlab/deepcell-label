import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useFeature, useLabeled, useSelect } from '../../ProjectContext';

const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const red = [255, 0, 0, 255];

const OutlineCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  const background = useSelector(select, (state) => state.context.background);

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const feature = useFeature(featureIndex);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = Array(height * width).fill(0);
  }

  const kernel = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    const gpu = new GPU({
      canvas,
      gl,
    });
    kernel.current = gpu
      .createKernel(function (data, foreground, background) {
        const n = this.thread.x + this.constants.w * (this.constants.h - this.thread.y);
        const label = data[n];
        const outline =
          label !== 0 &&
          ((this.thread.x !== 0 && data[n - 1] !== label) ||
            (this.thread.x !== this.constants.w - 1 && data[n + 1] !== label) ||
            (this.thread.y !== 0 && data[n - this.constants.w] !== label) ||
            (this.thread.y !== this.constants.h - 1 && data[n + this.constants.w] !== label));

        if (outline && label === background) {
          this.color(1, 0, 0, 1);
        } else if (outline) {
          this.color(1, 1, 1, 1);
        } else if (label === foreground && foreground !== 0) {
          this.color(1, 1, 1, 0.5);
        } else {
          this.color(0, 0, 0, 0);
        }
      })
      .setConstants({ w: width, h: height })
      .setOutput([width, height])
      .setGraphical(true);
  }, [width, height]);

  useEffect(() => {
    kernel.current(labeledArray, foreground, background);
    setCanvases((canvases) => ({ ...canvases, outline: canvasRef.current }));
    // return () =>
    //   setCanvases((canvases) => {
    //     delete canvases['outline'];
    //     return { ...canvases };
    //   });
  }, [labeledArray, foreground, background, setCanvases]);

  return <canvas hidden={true} id={'outline-canvas'} ref={canvasRef} />;
};

export default OutlineCanvas;
