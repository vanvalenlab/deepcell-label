import { useSelector } from '@xstate/react';
import { GPU } from 'gpu.js';
import { useEffect, useRef } from 'react';
import { useCanvas, useThreshold } from '../../ProjectContext';

const gl2 = document.createElement('canvas').getContext('webgl2');
const gl = document.createElement('canvas').getContext('webgl');

const ThresholdCanvas = ({ setCanvases }) => {
  const canvas = useCanvas();
  const width = useSelector(canvas, (state) => state.context.width);
  const height = useSelector(canvas, (state) => state.context.height);

  const threshold = useThreshold();
  const x1 = useSelector(threshold, (state) => state.context.x);
  const y1 = useSelector(threshold, (state) => state.context.y);
  const [x2, y2] = useSelector(threshold, (state) => state.context.firstPoint);
  const show = useSelector(threshold, (state) => state.matches('dragging'));

  const kernelRef = useRef();
  const canvasRef = useRef();
  const kernelCanvasRef = useRef();
  const drawCanvasRef = useRef();

  useEffect(() => {
    kernelCanvasRef.current = document.createElement('canvas');
    drawCanvasRef.current = document.createElement('canvas');
    drawCanvasRef.current.width = width;
    drawCanvasRef.current.height = height;
  }, [height, width]);

  useEffect(() => {
    const canvas = kernelCanvasRef.current;
    if (gl2) {
      canvas.getContext('webgl2', { premultipliedAlpha: false });
    } else if (gl) {
      canvas.getContext('webgl', { premultipliedAlpha: false });
    }
    const gpu = new GPU({ canvas });
    const kernel = gpu.createKernel(
      function (x1, y1, x2, y2) {
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
    if (show) {
      // Compute threshold box with the kernel
      kernelRef.current(x1, y1, x2, y2);
      // Draw the threshold box on a separate canvas (needed to reuse webgl output)
      const drawCtx = drawCanvasRef.current.getContext('2d');
      drawCtx.clearRect(0, 0, width, height);
      drawCtx.drawImage(kernelCanvasRef.current, 0, 0);
      // Rerender the parent canvas
      setCanvases((canvases) => ({ ...canvases, tool: drawCanvasRef.current }));
    } else {
      // Remove this component's canvas from the parent canvas
      setCanvases((canvases) => {
        delete canvases['tool'];
        return { ...canvases };
      });
    }
  }, [setCanvases, show, x1, y1, x2, y2, width, height]);

  return null;
};

export default ThresholdCanvas;
