/** Modified from https://github.com/hms-dbmi/viv */
import React from 'react';
import { useSelector } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';

import LayerOptions from './LayerOptions';
import { useRaw, useImage } from '../ServiceContext';

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
  const classes = useStyles();

  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  return (
    <Grid
      container
      direction="column"
      m={2}
      justify="center"
      className={classes.root}
    >
      <Grid container direction="row" justify="space-between">
        <Grid item xs={grayscale ? 8 : 10}>
          <LayerSelector layer={layer} />
        </Grid>
        <Grid item>
          {!grayscale ? <LayerOptions layer={layer} /> : <InvertToggle />}
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={2}>
          {!grayscale && <LayerCheckbox layer={layer} />}
        </Grid>
        <Grid item xs={10}>
          <LayerSlider layer={layer} />
        </Grid>
      </Grid>
    </Grid>
  );
}

const LayerSelector = ({ layer }) => {
  const channel = useSelector(layer, state => state.context.channel);

  const raw = useRaw();
  const names = useSelector(raw, state => state.context.channelNames);

  const onChange = e => {
    layer.send({ type: 'CHANGE_CHANNEL', channel: e.target.value });
  };
  
  return (
    <Select
      native
      value={channel}
      onChange={onChange}
    >
      {names.map((opt, index) => (
        <option key={index} value={index}>
          {opt}
        </option>
      ))}
    </Select>
  );
}

const LayerCheckbox = ({ layer }) => {
  const color = useSelector(layer, state => state.context.color);
  const isOn = useSelector(layer, state => state.context.on);

  return <Checkbox
    onChange={() => layer.send('TOGGLE_ON')}
    checked={isOn}
    style={{
      color: color,
      '&$checked': {
        color: color
      }
    }}
  />;
};

const LayerSlider = ({ layer }) => {
  const range = useSelector(layer, state => state.context.range);
  const color = useSelector(layer, state => state.context.color);

  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  const onChange = (event, newValue) => {
    layer.send({ type: 'SETRANGE', range: newValue });
  };

  return <Slider
    value={range}
    onChange={onChange}
    valueLabelDisplay="off"
    min={0}
    max={255}
    step={1}
    orientation="horizontal"
    style={{
      color: grayscale ? 'primary' : color,
      marginTop: '7px'
    }}
  />;
};

const InvertToggle = () => {
  const raw = useRaw();
  const invert = useSelector(raw, state => state.context.invert);
  
  return (
    <FormGroup row>
      <FormControlLabel
      control={<Switch
        size='small' 
        checked={invert} 
        onChange={() => raw.send('TOGGLE_INVERT')} />}
      label="Invert"
      labelPlacement="start"
    />
    </FormGroup>
  );
};

export default LayerController;
