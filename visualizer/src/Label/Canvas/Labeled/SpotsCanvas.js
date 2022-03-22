import { useSelector } from '@xstate/react';
import { groupBy } from 'lodash';
import { useEffect } from 'react';
import {
  useArrays,
  useCanvas,
  useFullResolutionCanvas,
  useLabels,
  useSpots,
} from '../../../ProjectContext';

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
  const zoom = useSelector(canvas, (state) => state.context.zoom);
  const sx = useSelector(canvas, (state) => state.context.sx);
  const sy = useSelector(canvas, (state) => state.context.sy);
  const sh = useSelector(canvas, (state) => state.context.height);
  const sw = useSelector(canvas, (state) => state.context.width);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const width = sw * scale * window.devicePixelRatio;
  const height = sh * scale * window.devicePixelRatio;

  const labels = useLabels();
  const colormap = useSelector(labels, (state) => state.context.colormap);

  const drawCanvas = useFullResolutionCanvas();

  const arrays = useArrays();
  const labeledArray = useSelector(
    arrays,
    ({ context: { frame, feature, labeledArrays } }) =>
      labeledArrays && labeledArrays[feature][frame]
  );

  const spots = useSpots();
  const spotsArray = useSelector(spots, (state) => state.context.spots);
  const radius = useSelector(spots, (state) => state.context.radius);
  const opacity = useSelector(spots, (state) => state.context.opacity);
  const showSpots = useSelector(spots, (state) => state.context.showSpots);
  const colorSpots = useSelector(spots, (state) => state.context.colorSpots);
  const outline = useSelector(spots, (state) => state.context.outline);

  useEffect(() => {
    const ctx = drawCanvas.getContext('2d');
    // ctx.globalCompositeOperation = 'lighten';
    ctx.clearRect(0, 0, width, height);
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
    }
    setCanvases((canvases) => ({ ...canvases, spots: drawCanvas }));
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
  ]);

  return null;
}

export default SpotsCanvas;
