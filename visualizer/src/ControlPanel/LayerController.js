/** Modified from https://github.com/hms-dbmi/viv */
import React from 'react';
import { useSelector } from '@xstate/react';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { makeStyles } from '@material-ui/core/styles';

import ChannelOptions from './LayerOptions';
import { useRaw } from '../ServiceContext';

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1)
  },
  icon: {
    color: theme.palette.text.primary,
    marginTop: '4px'
  }
}));

function LayerController({ layer }) {
  const channel = useSelector(layer, state => state.context.channel);
  const range = useSelector(layer, state => state.context.range);
  const color = useSelector(layer, state => state.context.color);
  const isOn = useSelector(layer, state => state.context.on);

  const raw = useRaw();
  const invert = useSelector(raw, state => state.context.invert);
  const channelOptions = useSelector(raw, state => state.context.channelNames);
  
  const name = channelOptions[channel];
  
  const classes = useStyles();
  const [min, max] = [0, 255];
  const step = 1;

  const handleSliderChange = (event, newValue) => {
    layer.send({ type: 'SETRANGE', range: newValue });
  };

  return (
    <Grid
      container
      direction="column"
      m={2}
      justify="center"
      className={classes.root}
    >
      <Grid container direction="row" justify="space-between">
        <Grid item xs={10}>
          <Select
            native
            value={channel}
            onChange={e => layer.send({ type: 'CHANGE_CHANNEL', channel: e.target.value })}
          >
            {channelOptions.map((opt, index) => (
              <option key={index} value={index}>
                {opt}
              </option>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <ChannelOptions layer={layer} />
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={2}>
          <Checkbox
            onChange={() => layer.send('TOGGLE_ON')}
            checked={isOn}
            style={{
              color: color,
              '&$checked': {
                color: color
              }
            }}
          />
        </Grid>
        <Grid item xs={10}>
          <Slider
            value={range}
            onChange={handleSliderChange}
            valueLabelDisplay="off"
            getAriaLabel={() => `${name}-${color}-${range}`}
            min={min}
            max={max}
            step={step}
            orientation="horizontal"
            style={{
              color: color,
              marginTop: '7px'
            }}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default LayerController;
