import { FormLabel, makeStyles } from '@material-ui/core';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useEffect, useRef } from 'react';
import { useRaw } from '../../../ProjectContext';

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1),
  },
}));

const InvertToggle = ({ channel }) => {
  const invert = useSelector(channel, state => state.context.invert);

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
    return () => unbind('i');
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
  const names = useSelector(raw, state => state.context.channelNames);

  const grayscale = useSelector(raw, state => state.context.colorMode);
  const channel = useSelector(grayscale, state => state.context.channel);

  const onChange = e => {
    grayscale.send({ type: 'LOAD_CHANNEL', channel: Number(e.target.value) });
  };

  const tooltip = (
    <span>
      Cycle with <kbd>C</kbd> or <kbd>Shift</kbd> + <kbd>C</kbd>
    </span>
  );

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
  const brightness = useSelector(channel, state => state.context.brightness);

  const { send } = channel;

  const onChange = (event, newValue) =>
    send({ type: 'SET_BRIGHTNESS', brightness: Number(newValue) });

  const onDoubleClick = () => send({ type: 'SET_BRIGHTNESS', brightness: 0 });

  return (
    <>
      <FormLabel>Brightness</FormLabel>
      <Slider
        value={brightness}
        onChange={onChange}
        onDoubleClick={onDoubleClick}
        valueLabelDisplay='off'
        min={-1}
        max={1}
        step={0.01}
        orientation='horizontal'
        style={{
          color: 'primary',
          marginTop: '7px',
        }}
      />
    </>
  );
};

const ContrastSlider = ({ channel }) => {
  const contrast = useSelector(channel, state => state.context.contrast);
  const { send } = channel;

  const onChange = (event, newValue) => send({ type: 'SET_CONTRAST', contrast: Number(newValue) });

  const onDoubleClick = () => send({ type: 'SET_CONTRAST', contrast: 0 });

  return (
    <>
      <FormLabel>Contrast</FormLabel>
      <Slider
        value={contrast}
        onChange={onChange}
        onDoubleClick={onDoubleClick}
        valueLabelDisplay='off'
        min={-1}
        max={1}
        step={0.01}
        orientation='horizontal'
        style={{
          color: 'primary',
          marginTop: '7px',
        }}
      />
    </>
  );
};
const RangeSlider = ({ channel }) => {
  const { send } = channel;
  const range = useSelector(channel, state => state.context.range);

  const onChange = (_, value) => send({ type: 'SET_RANGE', range: value });
  const onDoubleClick = () => send({ type: 'SET_RANGE', range: [0, 255] });

  return (
    <>
      <FormLabel>Range</FormLabel>
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
          color: 'primary',
          marginTop: '7px',
        }}
      />
    </>
  );
};

const GrayscaleControls = () => {
  const raw = useRaw();
  const channel = useSelector(raw, state => state.context.channels[state.context.channel]);

  const styles = useStyles();

  useEffect(() => {
    bind('0', () => raw.send('RESET'));
    return () => unbind('0');
  }, [raw]);

  return (
    <Grid style={{ width: '100%' }} item>
      <Grid container direction='column' m={2} justify='center' className={styles.root}>
        <Grid container direction='row' justify='space-between'>
          <Grid item xs={8}>
            <ChannelSelector />
          </Grid>
          <Grid item xs={4}>
            <InvertToggle channel={channel} />
          </Grid>
        </Grid>
        <Grid container direction='row' justify='flex-start' alignItems='center'>
          <Grid item xs={12}>
            <RangeSlider channel={channel} />
            <BrightnessSlider channel={channel} />
            <ContrastSlider channel={channel} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default GrayscaleControls;
