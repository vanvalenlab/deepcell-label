import { Box, Checkbox, MenuItem, TextField, Typography } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useMousetrapRef, useRaw } from '../../ProjectContext';

const InvertToggle = ({ channel }) => {
  const invert = useSelector(channel, (state) => state.context.invert);

  const inputRef = useMousetrapRef();

  useEffect(() => {
    bind('i', () => channel.send('TOGGLE_INVERT'));
  }, [channel]);

  return (
    <Tooltip title={<kbd>I</kbd>} placement='right'>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              size='small'
              checked={invert}
              onChange={() => channel.send('TOGGLE_INVERT')}
              inputRef={inputRef}
            />
          }
          label='Invert'
          labelPlacement='start'
          sx={{ ml: 0 }}
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
      <kbd>C</kbd> / <kbd>Shift</kbd> + <kbd>C</kbd>
    </span>
  );

  useEffect(() => {
    const prevChannel = (channel - 1 + numChannels) % numChannels;
    const nextChannel = (channel + 1) % numChannels;
    bind('shift+c', () => raw.send({ type: 'SET_CHANNEL', channel: prevChannel }));
    bind('c', () => raw.send({ type: 'SET_CHANNEL', channel: nextChannel }));
  }, [raw, channel, numChannels]);

  return (
    <Tooltip title={tooltip} placement='right'>
      <TextField select size='small' value={channel} onChange={onChange}>
        {names.map((opt, index) => (
          <MenuItem key={index} value={index}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    </Tooltip>
  );
};

const BrightnessSlider = ({ channel }) => {
  const brightness = useSelector(channel, (state) => state.context.brightness);
  const inputRef = useMousetrapRef();

  const { send } = channel;

  const onChange = (event, newValue) =>
    send({ type: 'SET_BRIGHTNESS', brightness: Number(newValue) });

  const onDoubleClick = () => send({ type: 'SET_BRIGHTNESS', brightness: 0 });

  return (
    <Slider
      sx={{ color: 'primary', p: 0 }}
      value={brightness}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={-1}
      max={1}
      step={0.01}
      orientation='horizontal'
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
};

const ContrastSlider = ({ channel }) => {
  const contrast = useSelector(channel, (state) => state.context.contrast);
  const inputRef = useMousetrapRef();

  const onChange = (event, newValue) =>
    channel.send({ type: 'SET_CONTRAST', contrast: Number(newValue) });

  const onDoubleClick = () => channel.send({ type: 'SET_CONTRAST', contrast: 0 });

  return (
    <Slider
      sx={{ color: 'primary', p: 0 }}
      value={contrast}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={-1}
      max={1}
      step={0.01}
      orientation='horizontal'
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
};

const RangeSlider = ({ channel }) => {
  const range = useSelector(channel, (state) => state.context.range);
  const inputRef = useMousetrapRef();

  const onChange = (_, value) => channel.send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => channel.send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <Slider
      sx={{ color: 'primary', p: 0 }}
      value={range}
      onChange={onChange}
      onDoubleClick={onDoubleClick}
      valueLabelDisplay='off'
      min={0}
      max={255}
      step={1}
      orientation='horizontal'
      componentsProps={{ input: { ref: inputRef } }}
    />
  );
};

const GrayscaleControls = () => {
  const raw = useRaw();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);
  const channel = useSelector(raw, (state) => state.context.channels[state.context.channel]);

  useEffect(() => {
    bind('0', () => raw.send('RESET'));
  }, [raw]);

  return (
    <Grid sx={{ width: '100%' }} item>
      <Grid container direction='column'>
        <Grid item xs={12} container direction='row' sx={{ justifyContent: 'space-between' }}>
          {numChannels > 1 && <ChannelSelector />}
          <div />
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
              <Typography>Range</Typography>
              <Typography>Brightness</Typography>
              <Typography>Contrast</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                flex: 1,
                mx: 1,
              }}
            >
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
