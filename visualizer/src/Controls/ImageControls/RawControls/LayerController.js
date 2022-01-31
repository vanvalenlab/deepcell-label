/** Modified from https://github.com/hms-dbmi/viv */
import { MenuItem, TextField } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';
import LayerOptions from './LayerOptions';

function LayerSelector({ layer }) {
  const channel = useSelector(layer, (state) => state.context.channel);

  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);

  const onChange = (e) => {
    layer.send({ type: 'CHANGE_CHANNEL', channel: Number(e.target.value) });
  };

  return (
    <TextField select size='small' value={channel} onChange={onChange}>
      {names.map((opt, index) => (
        <MenuItem key={index} value={index}>
          {opt}
        </MenuItem>
      ))}
    </TextField>
  );
}

function LayerCheckbox({ layer }) {
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });
  const isOn = useSelector(layer, (state) => state.context.on);

  return (
    <Checkbox
      onChange={() => layer.send('TOGGLE_ON')}
      checked={isOn}
      style={{
        color: color,
        '&$checked': {
          color: color,
        },
      }}
    />
  );
}

function LayerSlider({ layer }) {
  const { send } = layer;
  const range = useSelector(layer, (state) => state.context.range);
  const color = useSelector(layer, (state) => {
    const { color } = state.context;
    return color === '#FFFFFF' ? '#000000' : color;
  });

  const onChange = (_, value) => send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <Slider
      value={range}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={0}
      max={255}
      step={1}
      orientation='horizontal'
      style={{
        color: color,
        marginTop: '7px',
      }}
    />
  );
}

function LayerController({ layer }) {
  const channel = useSelector(layer, (state) => state.context.channel);

  const raw = useRaw();
  const colorMode = useSelector(raw, (state) => state.context.colorMode);
  const loading = useSelector(colorMode, (state) => state.context.loadingChannels.has(channel));

  return (
    <Grid container direction='column' justifyContent='center' sx={{ paddingTop: 1 }}>
      <Grid container direction='row' justifyContent='space-between'>
        <Grid item xs={10}>
          <LayerSelector layer={layer} />
        </Grid>
        <Grid item>
          <LayerOptions layer={layer} />
        </Grid>
      </Grid>
      <Grid container direction='row'>
        <Grid item xs={12}>
          {loading && <LinearProgress />}
        </Grid>
      </Grid>
      <Grid container direction='row' justifyContent='flex-start' alignItems='center'>
        <Grid item xs={2}>
          <LayerCheckbox layer={layer} />
        </Grid>
        <Grid item m={1} xs={9}>
          <LayerSlider layer={layer} />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default LayerController;
