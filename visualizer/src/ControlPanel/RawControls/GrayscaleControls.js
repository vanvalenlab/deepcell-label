import React, { useEffect, useRef } from 'react';
import { useSelector, useActor } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import Grid from '@material-ui/core/Grid';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';

import { useRaw, useImage } from '../../ServiceContext';

const InvertToggle = ({ channel }) => {
  const invert = useSelector(channel, state => state.context.invert);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = input.className + ' mousetrap';
  }, []);
  
  return (
    <Tooltip title='Press I to toggle'>
      <FormGroup row>
        <FormControlLabel
        control={<Switch
          size='small' 
          checked={invert} 
          onChange={() => channel.send('TOGGLE_INVERT')} 
          inputRef={inputRef}
        />}
        label="Invert"
        labelPlacement="start"
      />
      </FormGroup>
    </Tooltip>
  );
};

const ChannelSelector = () => {
  const raw = useRaw();
  const names = useSelector(raw, state => state.context.channelNames);

  const grayscale = useSelector(raw, state => state.context.colorMode);
  const channel = useSelector(grayscale, state => state.context.channel);

  const onChange = e => {
    raw.send({ type: 'LOADCHANNEL', channel: Number(e.target.value) });
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
};

const RangeSlider = ({ channel }) => {
  const range = useSelector(channel, state => state.context.range);

  const onChange = (event, newValue) => {
    channel.send({ type: 'SETRANGE', range: newValue });
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
      color: 'primary',
      marginTop: '7px'
    }}
  />;
};


const GrayscaleControls = () => {
  const raw = useRaw();
  const channel = useSelector(raw, state => state.context.channels[state.context.channel]);
  
  return <Grid style={{ width: '100%' }} item >
    <Grid
      container
      direction="column"
      m={2}
      justify="center"
    >
      <Grid container direction="row" justify="space-between">
        <Grid item xs={8}>
          <ChannelSelector />
        </Grid>
        <Grid item xs={4}>
          <InvertToggle channel={channel} />
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={12}>
          <RangeSlider channel={channel} />
        </Grid>
      </Grid>
    </Grid>
  </Grid>;
}

export default GrayscaleControls;
