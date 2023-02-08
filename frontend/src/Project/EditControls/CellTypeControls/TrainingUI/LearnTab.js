import LoadingButton from '@mui/lab/LoadingButton';
import { Box, Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useChannelExpression } from '../../../ProjectContext';
import CalculateWholeToggle from '../ChannelExpressionUI/CalculateWholeToggle';
import TrainingButtons from './TrainingButtons';

function LearnTab() {
  const quantities = ['Position', 'Mean', 'Total'];
  const [embedding, setEmbedding] = useState(0);
  const channelExpression = useChannelExpression();
  const calculating = useSelector(channelExpression, (state) =>
    state.matches('loaded.visualizing')
  );

  const handleVisualize = () => {
    if (quantities[embedding] === 'Position') {
      channelExpression.send({ type: 'CALCULATE', stat: quantities[embedding] });
    } else {
      channelExpression.send({ type: 'CALCULATE_UMAP', stat: quantities[embedding] });
    }
  };

  return (
    <>
      <Grid item display='flex'>
        <TextField
          select
          size='small'
          value={embedding}
          label='Embedding'
          onChange={(evt) => setEmbedding(evt.target.value)}
          sx={{ width: '47%' }}
        >
          {quantities.map((opt, index) => (
            <MenuItem key={index} value={index}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ marginLeft: '1%' }}>
          <CalculateWholeToggle />
        </Box>
      </Grid>
      <Grid item>
        {!calculating ? (
          <Button sx={{ width: '97%' }} variant='contained' onClick={handleVisualize}>
            Visualize
          </Button>
        ) : (
          <LoadingButton>Hi</LoadingButton>
        )}
      </Grid>
      <TrainingButtons />
    </>
  );
}

export default LearnTab;
