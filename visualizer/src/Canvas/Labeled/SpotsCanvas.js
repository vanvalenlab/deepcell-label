import { useSelector } from '@xstate/react';
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
      for (let spot of visibleSpots) {
        const [x, y] = spot;
        const cell = labeledArray ? labeledArray[Math.floor(y)][Math.floor(x)] : 0;
        let [r, g, b] = cell !== 0 && colormap[cell] ? colormap[cell] : [255, 255, 255];
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
