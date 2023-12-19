import { useSelector } from '@xstate/react';
import React, { useCallback, useState } from 'react';
import { useEditSegment, useSelect, useRaw } from '../../../ProjectContext';
import ActionButton from './ActionButton';
import { MenuItem, TextField, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';

function LayerSelector({ layer, channelType }) {
  const segment = useEditSegment();
  const primaryChannel = useSelector(segment, (state) => state.context.primaryChannel);
  const secondaryChannel = useSelector(segment, (state) => state.context.secondaryChannel);

  const raw = useRaw();
  const names = useSelector(raw, (state) => state.context.channelNames);

  const onChangePrimary = (e) => {
    segment.send({ type: 'SET_PRIMARY_CHANNEL', primaryChannel: Number(e.target.value) });
  };

  const onChangeSecondary = (e) => {
    segment.send({ type: 'SET_SECONDARY_CHANNEL', secondaryChannel: Number(e.target.value) });
  };

  return channelType == 'primary' ? (
    <TextField
      select
      size='small'
      value={primaryChannel}
      onChange={onChangePrimary}
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
      value={secondaryChannel}
      onChange={onChangeSecondary}
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

function SegmentAllButton({ props, layer }) {
  const segment = useEditSegment();

  const onClick = useCallback(() => segment.send('SEGMENTALL'), [segment]);
  const [addButtonClicked, setAddButtonClicked] = useState(false);
  const [boxes, setBoxes] = useState([]);

  const addChannel = () => {
    setBoxes([...boxes, { layer: layer, channelType: 'secondary' }]);
    setAddButtonClicked(true);
  };

  return (
    <Grid>
      Select Primary Channel
      <Grid item xs={10.5}>
        <LayerSelector layer={layer} channelType={'primary'} />
      </Grid>
      Select Secondary Channel
      <Grid item xs={10.5}>
        <Box sx={{ minWidth: 140, marginTop: 0.4 }}>
          {!addButtonClicked && (
            <Button
              onClick={addChannel}
              fullWidth
              variant='outlined'
              sx={{ borderStyle: 'dashed', p: 0.5 }}
              startIcon={<AddIcon />}
              size='small'
            >
              Secondary Channel
            </Button>
          )}
        </Box>
        {boxes.map((box, index) => (
          <Box key={index} sx={{ minWidth: 140, marginTop: 0.4 }}>
            <LayerSelector layer={box.layer} channelType={box.channelType} />
          </Box>
        ))}
      </Grid>
      <Grid>
        <ActionButton
          {...props}
          tooltipText={'Run cell sam on selected channel to get segmentation masks'}
          onClick={onClick}
          hotkey='m'
        >
          Segment All
        </ActionButton>
      </Grid>
    </Grid>
  );
}

export default SegmentAllButton;
