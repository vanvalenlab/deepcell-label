import { MenuItem, TextField } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useSelector } from '@xstate/react';
import { useChannelExpression, useRaw } from '../../../ProjectContext';

function ChannelSelect(props) {
  const { plot, setPlot } = props;
  const raw = useRaw();
  const channelExpression = useChannelExpression();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);
  const names = useSelector(raw, (state) => state.context.channelNames);
  const channelX = useSelector(channelExpression, (state) => state.context.channelX);
  const channelY = useSelector(channelExpression, (state) => state.context.channelY);

  const handleChangePlot = (evt) => {
    setPlot(evt.target.value);
  };

  const handleChangeX = (evt) => {
    channelExpression.send({ type: 'CHANNEL_X', channelX: evt.target.value });
  };

  const handleChangeY = (evt) => {
    channelExpression.send({ type: 'CHANNEL_Y', channelY: evt.target.value });
  };

  return (
    <>
      <Grid item display='flex' sx={{ marginTop: 2 }}>
        <TextField
          select
          size='small'
          value={channelX}
          label='X Channel'
          sx={{ width: '47%' }}
          onChange={handleChangeX}
        >
          {names.map((opt, index) => (
            <MenuItem key={index} value={index}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size='small'
          value={channelY}
          label='Y Channel'
          disabled={plot === 'histogram'}
          sx={{ width: '47%', marginLeft: '3%' }}
          onChange={handleChangeY}
        >
          {names.map((opt, index) => (
            <MenuItem key={index} value={index}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item sx={{ marginLeft: '0.5em' }}>
        <FormControl>
          <RadioGroup row value={plot} onChange={handleChangePlot}>
            <FormControlLabel value='histogram' control={<Radio />} label='Histogram' />
            <FormControlLabel
              sx={{ marginLeft: '2.5em' }}
              disabled={numChannels === 1}
              value='scatter'
              control={<Radio />}
              label='Scatter'
            />
          </RadioGroup>
        </FormControl>
      </Grid>
    </>
  );
}

export default ChannelSelect;
