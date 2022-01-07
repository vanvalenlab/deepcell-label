import { useSelector } from '@xstate/react';
import colormap from 'colormap';
import { GPU } from 'gpu.js';
import { useEffect, useMemo, useRef } from 'react';
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
  let labeledArray = useSelector(feature, (state) => state.context.labeledArray);
  if (!labeledArray) {
    labeledArray = Array(height * width).fill(0);
  }

  const select = useSelect();
  const foreground = useSelector(select, (state) => state.context.foreground);
  const maxLabel = useSelector(select, (state) => Math.max(...Object.keys(state.context.labels)));
  const cmap = useMemo(
    () =>
      colormap({
        colormap: 'viridis',
        nshades: Math.max(9, maxLabel),
        format: 'rgba',
      }),
    [maxLabel]
  );

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
      .createKernel(function (labels, colormap, foreground, highlight, highlightColor, opacity) {
        const n = this.thread.x + this.constants.w * (this.constants.h - 1 - this.thread.y);
        const label = labels[n];
        if (highlight && label === foreground && foreground !== 0) {
          const [r, g, b] = highlightColor;
          this.color(r / 255, g / 255, b / 255, opacity);
        } else if (label !== 0) {
          const [r, g, b] = colormap[label - 1];
          this.color(r / 255, g / 255, b / 255, opacity);
        } else {
          this.color(0, 0, 0, opacity);
        }
      })
      .setConstants({ w: width, h: height })
      .setOutput([width, height])
      .setGraphical(true)
      .setDynamicArguments(true);
  }, [width, height]);

  useEffect(() => {
    kernel.current(labeledArray, cmap, foreground, highlight, highlightColor, opacity);
    setCanvases((canvases) => ({ ...canvases, labeled: canvasRef.current }));
  }, [labeledArray, cmap, foreground, highlight, opacity, setCanvases]);

  return <canvas hidden={true} id={'labeled-canvas'} ref={canvasRef} />;
};

export default LabeledCanvas;
