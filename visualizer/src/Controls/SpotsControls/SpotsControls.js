import { FormLabel, Typography } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useCanvas, useSpots } from '../../ProjectContext';

function SpotsCheckbox() {
  const spots = useSpots();
  const isOn = useSelector(spots, (state) => state.context.showSpots);

  return <Checkbox sx={{ p: 0 }} onChange={() => spots.send('TOGGLE_SHOW_SPOTS')} checked={isOn} />;
}

function SpotOpacitySlider() {
  const spots = useSpots();
  const opacity = useSelector(spots, (state) => state.context.opacity);
  return (
    <Slider
      value={opacity}
      onChange={(_, value) => spots.send({ type: 'SET_OPACITY', opacity: value })}
      min={0}
      max={1}
      step={0.01}
      orientation='horizontal'
      valueLabelDisplay='auto'
    />
  );
}

function SpotRadiusSlider() {
  const canvas = useCanvas();
  const height = useSelector(canvas, (state) => state.context.height);
  const width = useSelector(canvas, (state) => state.context.width);
  const scale = useSelector(canvas, (state) => state.context.scale);

  const maxRadius = Math.floor(0.01 * Math.min(height, width) * window.devicePixelRatio * scale);

  const spots = useSpots();
  const radius = useSelector(spots, (state) => state.context.radius);

  return (
    <Slider
      value={radius}
      onChange={(_, value) => spots.send({ type: 'SET_RADIUS', radius: value })}
      min={0}
      max={maxRadius}
      step={1}
      orientation='horizontal'
      valueLabelDisplay='auto'
    />
  );
}

function SpotsControls() {
  return (
    <Grid container direction='column' justifyContent='center' sx={{ pt: 1 }}>
      <Grid container direction='row'>
        <Grid item xs={4}>
          <FormLabel>Spots</FormLabel>
        </Grid>
        <Grid item xs={7} />
        <Grid item xs={1}>
          <SpotsCheckbox />
        </Grid>
      </Grid>
      <Grid container direction='row' alignItems='center'>
        <Grid item xs={4}>
          <Typography>Radius</Typography>
        </Grid>
        <Grid item xs={8}>
          <SpotRadiusSlider />
        </Grid>
      </Grid>
      <Grid container direction='row' justify='flex-start' alignItems='center'>
        <Grid item xs={4}>
          <Typography>Opacity</Typography>
        </Grid>
        <Grid item xs={8}>
          <SpotOpacitySlider />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default SpotsControls;
