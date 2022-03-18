import { useSelector } from '@xstate/react';
import { useEffect } from 'react';
import { useCanvas, useFullResolutionCanvas, useLabels, useSpots } from '../../ProjectContext';

const highlightColor = [255, 0, 0];

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

  const spots = useSpots();
  const spotArray = useSelector(spots, (state) => state.context.spots);
  const radius = useSelector(spots, (state) => state.context.radius);
  const opacity = useSelector(spots, (state) => state.context.opacity);

  useEffect(() => {
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    const scaledRadius = (radius / window.devicePixelRatio / scale) * zoom;
    const visibleSpots = spotArray.filter(
      (spot) =>
        sx - scaledRadius * zoom < spot[1] &&
        spot[1] < sx + sw / zoom + scaledRadius &&
        sy - scaledRadius * zoom < spot[0] &&
        spot[0] < sy + sh / zoom + scaledRadius
    );
    for (let spot of visibleSpots) {
      const [y, x, cell] = spot;
      // const [r, g, b] = colormap[cell];
      const [r, g, b] = [255, 0, 255];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(
        (x - sx) * zoom * scale * window.devicePixelRatio,
        (y - sy) * zoom * scale * window.devicePixelRatio,
        radius,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
    setCanvases((canvases) => ({ ...canvases, spots: drawCanvas }));
  }, [setCanvases, sh, sw, sx, sy, radius, zoom, width, height, colormap, spots, opacity]);

  return null;
}

export default SpotsCanvas;
