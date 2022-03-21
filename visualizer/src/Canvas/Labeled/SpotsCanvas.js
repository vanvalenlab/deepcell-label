import { useSelector } from '@xstate/react';
import { groupBy } from 'lodash';
import { useEffect } from 'react';
import {
  useArrays,
  useCanvas,
  useFullResolutionCanvas,
  useLabels,
  useSpots,
} from '../../ProjectContext';

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
  const spotArray = useSelector(spots, (state) => state.context.spots);
  const radius = useSelector(spots, (state) => state.context.radius);
  const opacity = useSelector(spots, (state) => state.context.opacity);
  const showSpots = useSelector(spots, (state) => state.context.showSpots);

  useEffect(() => {
    const ctx = drawCanvas.getContext('2d');
    // ctx.globalCompositeOperation = 'lighten';
    ctx.clearRect(0, 0, width, height);
    if (showSpots) {
      const scaledRadius = (radius / window.devicePixelRatio / scale) * zoom;
      const visibleSpots = spotArray.filter(
        ([x, y]) =>
          sx - scaledRadius * zoom < x &&
          x < sx + sw / zoom + scaledRadius &&
          sy - scaledRadius * zoom < y &&
          y < sy + sh / zoom + scaledRadius
      );
      const cellSpots = groupBy(visibleSpots, ([x, y]) =>
        labeledArray ? labeledArray[Math.floor(y)][Math.floor(x)] : 0
      );

      for (let cell in cellSpots) {
        const spots = cellSpots[cell];
        ctx.beginPath();
        for (let spot of spots) {
          const [x, y] = spot;
          // const cell = labeledArray ? labeledArray[Math.floor(y)][Math.floor(x)] : 0;
          const cx = Math.floor((x - sx) * zoom * scale * window.devicePixelRatio);
          const cy = Math.floor((y - sy) * zoom * scale * window.devicePixelRatio);
          ctx.moveTo(cx + radius, cy);
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        }
        const [r, g, b] = Number(cell) !== 0 && colormap[cell] ? colormap[cell] : [255, 255, 255];
        ctx.closePath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        // ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.stroke();
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
    labeledArray,
  ]);

  return null;
}

export default SpotsCanvas;
