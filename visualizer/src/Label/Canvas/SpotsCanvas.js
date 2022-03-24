import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { groupBy } from 'lodash';
import { useEffect } from 'react';
import {
  useArrays,
  useCanvas,
  useFullResolutionCanvas,
  useLabels,
  useSpots,
} from '../../ProjectContext';

function drawSpots(ctx, spots, radius, color, opacity, outline) {
  ctx.beginPath();
  for (let spot of spots) {
    const [x, y] = spot;
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
  }
  const [r, g, b] = color;
  ctx.closePath();
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.stroke();
  }
}

function SpotsCanvas({ setCanvases }) {
  const canvas = useCanvas();
  const { sx, sy, zoom, sw, sh, scale, moving, initialPosition } = useSelector(
    canvas,
    (state) => {
      const { sx, sy, zoom, width, height, scale, initialPosition } = state.context;
      const moving = state.matches('moving.moving');
      return { sx, sy, zoom, sw: width, sh: height, scale, moving, initialPosition };
    },
    equal
  );
  const { sx: initialSx, sy: initialSy, zoom: initialZoom } = initialPosition;

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const labels = useLabels();
  const colormap = useSelector(labels, (state) => state.context.colormap);

  const drawCanvas = useFullResolutionCanvas();
  const movingCanvas = useFullResolutionCanvas();

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    ({ context: { frame, feature, labeledArrays } }) =>
      labeledArrays && labeledArrays[feature][frame]
  );

  const spots = useSpots();
  const { spotsArray, radius, opacity, showSpots, colorSpots, outline } = useSelector(
    spots,
    ({ context: { spots: spotsArray, radius, opacity, showSpots, colorSpots, outline } }) => ({
      spotsArray,
      radius,
      opacity,
      showSpots,
      colorSpots,
      outline,
    }),
    equal
  );

  useEffect(() => {
    const ctx = drawCanvas.getContext('2d');
    if (showSpots) {
      const imagePixelRadius = (radius * zoom) / scale / window.devicePixelRatio;
      const visibleSpots = spotsArray.filter(
        ([x, y]) =>
          sx - imagePixelRadius * zoom < x &&
          x < sx + sw / zoom + imagePixelRadius &&
          sy - imagePixelRadius * zoom < y &&
          y < sy + sh / zoom + imagePixelRadius
      );
      const imageToCanvas = zoom * scale * window.devicePixelRatio;
      if (moving) {
        const ctx = movingCanvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        const zoomFactor = initialZoom / zoom;
        const movingSx = (sx - initialSx) * window.devicePixelRatio * scale * zoom * zoomFactor;
        const movingSy = (sy - initialSy) * window.devicePixelRatio * scale * zoom * zoomFactor;
        const movingWidth = width * zoomFactor;
        const movingHeight = height * zoomFactor;
        ctx.drawImage(
          drawCanvas,
          movingSx,
          movingSy,
          movingWidth,
          movingHeight,
          0,
          0,
          width,
          height
        );
        setCanvases((canvases) => ({ ...canvases, spots: movingCanvas }));
      } else {
        ctx.clearRect(0, 0, width, height);
        if (colorSpots) {
          const cellSpots = groupBy(visibleSpots, ([x, y]) =>
            labeledArray ? labeledArray[Math.floor(y)][Math.floor(x)] : 0
          );

          for (let cell in cellSpots) {
            const spots = cellSpots[cell];
            const canvasSpots = spots.map(([x, y]) => [
              Math.floor((x - sx) * imageToCanvas),
              Math.floor((y - sy) * imageToCanvas),
            ]);
            const color = colormap[cell] && Number(cell) !== 0 ? colormap[cell] : [255, 255, 255];
            drawSpots(ctx, canvasSpots, radius, color, opacity, outline);
          }
        } else {
          const canvasSpots = visibleSpots.map(([x, y]) => [
            Math.floor((x - sx) * imageToCanvas),
            Math.floor((y - sy) * imageToCanvas),
          ]);
          const color = [255, 255, 255];
          drawSpots(ctx, canvasSpots, radius, color, opacity, outline);
        }
        setCanvases((canvases) => ({ ...canvases, spots: drawCanvas }));
      }
    }
  }, [
    setCanvases,
    sh,
    sw,
    sx,
    sy,
    radius,
    zoom,
    width,
    height,
    colormap,
    spots,
    opacity,
    showSpots,
    colorSpots,
    outline,
    labeledArray,
    moving,
    initialSx,
    initialSy,
    initialZoom,
  ]);

  return null;
}

export default SpotsCanvas;
