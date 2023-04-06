import { Grid } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useSelector } from '@xstate/react';
import { useChannelExpression, useTraining } from '../../../ProjectContext';

function EmbeddingColorMapToggle() {
  const channelExpression = useChannelExpression();
  const training = useTraining();
  const colorMapType = useSelector(channelExpression, (state) => state.context.embeddingColorType);
  const predUncertainties = useSelector(training, (state) => state.context.predUncertainties);

  const handleChange = (evt) => {
    channelExpression.send({ type: 'CHANGE_COLORMAP', colorMap: evt.target.value });
  };

  return (
    <Grid item sx={{ marginLeft: '0.5em' }}>
      <FormControl>
        <RadioGroup row value={colorMapType} onChange={handleChange}>
          <FormControlLabel value='label' control={<Radio />} label='Label' />
          <FormControlLabel
            disabled={!predUncertainties}
            sx={{ marginLeft: '5em' }}
            value='uncertainty'
            control={<Radio />}
            label='Uncertainty'
          />
        </RadioGroup>
      </FormControl>
    </Grid>
  );
}

export default EmbeddingColorMapToggle;
