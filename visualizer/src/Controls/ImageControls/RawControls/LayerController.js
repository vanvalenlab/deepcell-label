/** Modified from https://github.com/hms-dbmi/viv */
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';
import { makeStyles } from '@material-ui/core/styles';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ServiceContext';
import LayerOptions from './LayerOptions';

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1),
  },
}));

function LayerSelector({ layer }) {
  const channel = useSelector(layer, state => state.context.channel);

  const raw = useRaw();
  const names = useSelector(raw, state => state.context.channelNames);

  const onChange = e => {
    layer.send({ type: 'CHANGE_CHANNEL', channel: Number(e.target.value) });
  };

  return (
    <Select native value={channel} onChange={onChange}>
      {names.map((opt, index) => (
        <option key={index} value={index}>
          {opt}
        </option>
      ))}
    </Select>
  );
}

function LayerCheckbox({ layer }) {
  const color = useSelector(layer, state => state.context.color);
  const isOn = useSelector(layer, state => state.context.on);

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
  const range = useSelector(layer, state => state.context.range);
  const color = useSelector(layer, state => state.context.color);

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
  const classes = useStyles();

  const channel = useSelector(layer, state => state.context.channel);

  const raw = useRaw();
  const colorMode = useSelector(raw, state => state.context.colorMode);
  const loading = useSelector(colorMode, state => state.context.loadingChannels.has(channel));

  return (
    <Grid container direction='column' m={2} justify='center' className={classes.root}>
      <Grid container direction='row' justify='space-between'>
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
      <Grid container direction='row' justify='flex-start' alignItems='center'>
        <Grid item xs={2}>
          <LayerCheckbox layer={layer} />
        </Grid>
        <Grid item xs={10}>
          <LayerSlider layer={layer} />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default LayerController;
