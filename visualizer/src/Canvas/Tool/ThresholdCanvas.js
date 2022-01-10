import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useThreshold } from '../../ProjectContext';

const ThresholdCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const threshold = useThreshold();
  const x1 = useSelector(threshold, (state) => state.context.x);
  const y1 = useSelector(threshold, (state) => state.context.y);
  const [x2, y2] = useSelector(threshold, (state) => state.context.firstPoint);
  const show = useSelector(threshold, (state) => state.matches('dragging'));

  const kernel = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    const gpu = new GPU({ canvas, gl });
    kernel.current = gpu
      .createKernel(function (x1, y1, x2, y2) {
        const x = this.thread.x;
        const y = this.constants.h - this.thread.y;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if ((x === minX || x === maxX) && minY <= y && y <= maxY) {
          this.color(1, 1, 1, 1);
        } else if ((y === minY || y === maxY) && minX <= x && x <= maxX) {
          this.color(1, 1, 1, 1);
        } else if (minX <= x && x <= maxX && minY <= y && y <= maxY) {
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
    if (show) {
      // Render this component's canvas and the parent canvas
      kernel.current(x1, y1, x2, y2);
      setCanvases((canvases) => ({ ...canvases, tool: canvasRef.current }));
    } else {
      // Remove this component's canvas from the parent canvas
      setCanvases((canvases) => {
        delete canvases['tool'];
        return { ...canvases };
      });
    }
  }, [setCanvases, show, x1, y1, x2, y2]);

  return <canvas hidden={true} ref={canvasRef} />;
};

export default ThresholdCanvas;
