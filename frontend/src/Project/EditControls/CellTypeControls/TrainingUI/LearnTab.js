import { Box, Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { useChannelExpression } from '../../../ProjectContext';
import CalculateWholeToggle from '../ChannelExpressionUI/CalculateWholeToggle';
import TrainingButtons from './TrainingButtons';

function LearnTab() {
  const quantities = ['Position', 'Mean', 'Total'];
  const [embedding, setEmbedding] = useState(0);
  const channelExpression = useChannelExpression();

  const handleVisualize = () => {
    if (quantities[embedding] === 'Position') {
      channelExpression.send({ type: 'CALCULATE', stat: quantities[embedding] });
    } else {
      channelExpression.send({ type: 'CALCULATE_UMAP', stat: quantities[embedding], whole: true });
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
        <Button sx={{ width: '97%' }} variant='contained' onClick={handleVisualize}>
          Visualize
        </Button>
      </Grid>
      <TrainingButtons />
    </>
  );
}

export default LearnTab;
