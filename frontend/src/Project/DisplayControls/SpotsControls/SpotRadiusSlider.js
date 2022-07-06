import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useCanvas, useMousetrapRef, useSpots } from '../../ProjectContext';

function SpotRadiusSlider() {
  const canvas = useCanvas();
  const height = useSelector(canvas, (state) => state.context.height);
  const width = useSelector(canvas, (state) => state.context.width);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const maxRadius = Math.floor(0.01 * Math.min(height, width) * scale); // * window.devicePixelRatio

  const spots = useSpots();
  const radius = useSelector(spots, (state) => state.context.radius);

  const inputRef = useMousetrapRef();

  return (
    <Slider
      value={radius}
      onChange={(_, value) => spots.send({ type: 'SET_RADIUS', radius: value })}
      min={0}
      max={maxRadius}
      step={1}
      orientation='horizontal'
      valueLabelDisplay='auto'
      sx={{ p: 0 }}
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
}

export default SpotRadiusSlider;
