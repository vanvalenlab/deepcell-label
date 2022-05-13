import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useMousetrapRef, useSpots } from '../../ProjectContext';

function SpotOpacitySlider() {
  const spots = useSpots();
  const opacity = useSelector(spots, (state) => state.context.opacity);
  const inputRef = useMousetrapRef();
  return (
    <Slider
      value={opacity}
      onChange={(_, value) => spots.send({ type: 'SET_OPACITY', opacity: value })}
      min={0}
      max={1}
      step={0.01}
      orientation='horizontal'
      valueLabelDisplay='auto'
      sx={{ p: 0 }}
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
}

export default SpotOpacitySlider;
