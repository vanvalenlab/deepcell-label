import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegment, useSelect, useRaw } from '../../../ProjectContext';
import ActionButton from './ActionButton';
import { MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';

function LayerSelector({ layer, channelType }) {
  const index = useSelector(layer, (state) => state.context.layer);
  // console.log(layer);
  const segment = useEditSegment();
  const wholeCellChannel = useSelector(segment, (state) => state.context.wholeCellChannel);
  const nuclearChannel = useSelector(segment, (state) => state.context.nuclearChannel);

  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);

  const onChangeWholeCell = (e) => {
    segment.send({ type: 'SET_WHOLE_CELL_CHANNEL', wholeCellChannel: Number(e.target.value) });
    // raw.send({ type: 'EDIT_CHANNEL', channel: Number(e.target.value), index: index });
  };

  const onChangeNuclear = (e) => {
    segment.send({ type: 'SET_NUCLEAR_CHANNEL', nuclearChannel: Number(e.target.value) });
    // raw.send({ type: 'EDIT_CHANNEL', channel: Number(e.target.value), index: index });
  };

  return channelType == 'wholeCell' ? (
    <TextField
      select
      size='small'
      value={wholeCellChannel}
      onChange={onChangeWholeCell}
      sx={{ width: 130 }}
    >
      {names.map((opt, index) => (
        <MenuItem key={index} value={index}>
          {opt}
        </MenuItem>
      ))}
    </TextField>
  ) : (
    <TextField
      select
      size='small'
      value={nuclearChannel}
      onChange={onChangeNuclear}
      sx={{ width: 130 }}
    >
      {names.map((opt, index) => (
        <MenuItem key={index} value={index}>
          {opt}
        </MenuItem>
      ))}
    </TextField>
  );
}

function SelectWholeCellButton({ props, layer }) {
  const segment = useEditSegment();
  const grayscale = useSelector(segment, (state) => state.matches('display.grayscale'));

  const onClick = useCallback(() => segment.send('SELECT_CHANNELS'), [segment]);

  const tooltipText = (
    <span>
      Generate all the segmentation masks <kbd>M</kbd>
    </span>
  );

  return (
    <Grid>
      Select Whole Cell Channel
      <Grid item xs={10.5}>
        <LayerSelector layer={layer} channelType={'wholeCell'} />
      </Grid>
      Select Nuclear Channel
      <Grid item xs={10.5}>
        <LayerSelector layer={layer} channelType={'nuclear'} />
      </Grid>
      <Grid>
        <ActionButton
          {...props}
          // disabled={!grayscale}
          tooltipText={grayscale ? tooltipText : 'Requires a single channel'}
          onClick={onClick}
          hotkey='m'
        >
          Select Channels
        </ActionButton>
      </Grid>
    </Grid>
  );
}

export default SelectWholeCellButton;
