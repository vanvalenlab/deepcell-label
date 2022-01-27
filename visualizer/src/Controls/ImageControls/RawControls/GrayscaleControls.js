import { Box, FormLabel, makeStyles } from '@material-ui/core';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect, useRef } from 'react';
import { useRaw } from '../../../ProjectContext';

const useStyles = makeStyles((theme) => ({
  root: {
    paddingTop: theme.spacing(1),
  },
  slider: {
    color: 'primary',
    marginTop: theme.spacing(1),
  },
}));

const InvertToggle = ({ channel }) => {
  const invert = useSelector(channel, (state) => state.context.invert);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = `${input.className}  mousetrap`;
  }, []);

  const tooltip = (
    <span>
      Toggle with <kbd>I</kbd>
    </span>
  );

  useEffect(() => {
    bind('i', () => channel.send('TOGGLE_INVERT'));
  }, [channel]);

  return (
    <Tooltip title={tooltip}>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={invert}
              onChange={() => channel.send('TOGGLE_INVERT')}
              inputRef={inputRef}
            />
          }
          label='Invert'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
  );
};

const ChannelSelector = () => {
  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);
  const channel = useSelector(raw, (state) => state.context.channel);
  const numChannels = useSelector(raw, (state) => state.context.numChannels);

  const onChange = (e) => {
    raw.send({ type: 'SET_CHANNEL', channel: Number(e.target.value) });
  };

  const tooltip = (
    <span>
      Cycle with <kbd>C</kbd> or <kbd>Shift</kbd> + <kbd>C</kbd>
    </span>
  );

  useEffect(() => {
    const prevChannel = (channel - 1 + numChannels) % numChannels;
    const nextChannel = (channel + 1) % numChannels;
    bind('shift+c', () => raw.send({ type: 'SET_CHANNEL', channel: prevChannel }));
    bind('c', () => raw.send({ type: 'SET_CHANNEL', channel: nextChannel }));
  }, [raw, channel, numChannels]);

  return (
    <Tooltip title={tooltip}>
      <Select native value={channel} onChange={onChange}>
        {names.map((opt, index) => (
          <option key={index} value={index}>
            {opt}
          </option>
        ))}
      </Select>
    </Tooltip>
  );
};

const BrightnessSlider = ({ channel }) => {
  const styles = useStyles();
  const brightness = useSelector(channel, (state) => state.context.brightness);

  const { send } = channel;

  const onChange = (event, newValue) =>
    send({ type: 'SET_BRIGHTNESS', brightness: Number(newValue) });

  const onDoubleClick = () => send({ type: 'SET_BRIGHTNESS', brightness: 0 });

  return (
    <Slider
      className={styles.slider}
      value={brightness}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={-1}
      max={1}
      step={0.01}
      orientation='horizontal'
    />
  );
};

const ContrastSlider = ({ channel }) => {
  const styles = useStyles();
  const contrast = useSelector(channel, (state) => state.context.contrast);
  const { send } = channel;

  const onChange = (event, newValue) => send({ type: 'SET_CONTRAST', contrast: Number(newValue) });

  const onDoubleClick = () => send({ type: 'SET_CONTRAST', contrast: 0 });

  return (
    <Slider
      className={styles.slider}
      value={contrast}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={-1}
      max={1}
      step={0.01}
      orientation='horizontal'
    />
  );
};

const RangeSlider = ({ channel }) => {
  const styles = useStyles();
  const { send } = channel;
  const range = useSelector(channel, (state) => state.context.range);

  const onChange = (_, value) => send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <Slider
      className={styles.slider}
      value={range}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={0}
      max={255}
      step={1}
      orientation='horizontal'
    />
  );
};

const GrayscaleControls = () => {
  const raw = useRaw();
  const channel = useSelector(raw, (state) => state.context.channels[state.context.channel]);

  const styles = useStyles();

  useEffect(() => {
    bind('0', () => raw.send('RESET'));
  }, [raw]);

  return (
    <Grid style={{ width: '100%' }} item>
      <Grid container direction='column' m={1} className={styles.root}>
        <Grid item xs={12} container direction='row' style={{ justifyContent: 'space-between' }}>
          <ChannelSelector />
          <InvertToggle channel={channel} />
        </Grid>
        <Grid item xs={12} container direction='column'>
          <Grid item xs={12} container direction='row'>
            <Box
              display='flex'
              flexDirection='column'
              justifyContent='space-around'
              alignItems='flex-start'
            >
              <FormLabel>Range</FormLabel>
              <FormLabel>Brightness</FormLabel>
              <FormLabel>Contrast</FormLabel>
            </Box>
            <Box display='flex' flexDirection='column' justifyContent='space-around' flex='1'>
              <RangeSlider channel={channel} />
              <BrightnessSlider channel={channel} />
              <ContrastSlider channel={channel} />
            </Box>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default GrayscaleControls;
