import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useFeature, useLabeled, useSelect } from '../../ProjectContext';

const highlightColor = [255, 0, 0];

export const LabeledCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, (state) => state.context.feature);
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const opacity = useSelector(labeled, (state) => state.context.opacity);

  const feature = useFeature(featureIndex);
  const colormap = useSelector(feature, (state) => state.context.colormap);
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = Array(height * width).fill(0);
  }

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);

  const kernelRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.getContext('webgl2', { premultipliedAlpha: false });
    const gpu = new GPU({ canvas });
    const kernel = gpu.createKernel(
      function (labels, colormap, foreground, highlight, highlightColor, opacity) {
        const n = this.thread.x + this.constants.w * (this.constants.h - 1 - this.thread.y);
        const label = labels[n];
        if (highlight && label === foreground && foreground !== 0) {
          const [r, g, b] = highlightColor;
          this.color(r / 255, g / 255, b / 255, opacity);
        } else {
          const [r, g, b] = colormap[label];
          this.color(r / 255, g / 255, b / 255, opacity);
        }
      },
      {
        constants: { w: width, h: height },
        output: [width, height],
        graphical: true,
        dynamicArguments: true,
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
    kernelRef.current(labeledArray, colormap, foreground, highlight, highlightColor, opacity);
    // Rerender the parent canvas
    setCanvases((canvases) => ({ ...canvases, labeled: canvasRef.current }));
  }, [labeledArray, colormap, foreground, highlight, opacity, setCanvases]);

  return <canvas hidden={true} id={'labeled-canvas'} ref={canvasRef} />;
};

export default LabeledCanvas;
