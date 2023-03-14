import { Box, Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useChannelExpression } from '../../../ProjectContext';
import AddRemoveCancel from '../ChannelExpressionUI/AddRemoveCancel';
import CalculateWholeToggle from '../ChannelExpressionUI/CalculateWholeToggle';
import EmbeddingColorMapToggle from './EmbeddingColorMapToggle';
import EmbeddingPlot from './EmbeddingPlot';
import TrainingButtons from './TrainingButtons';

function LearnTab() {
  const [embedding, setEmbedding] = useState(0);
  const channelExpression = useChannelExpression();
  const imported = useSelector(channelExpression, (state) => state.context.embeddings);
  const embeddingPlotted = useSelector(channelExpression, (state) => state.context.reduction);
  const quantities = imported
    ? ['Position', 'Mean', 'Total', 'Imported']
    : ['Position', 'Mean', 'Total'];

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
      {embeddingPlotted ? (
        <>
          <EmbeddingColorMapToggle />
          <EmbeddingPlot embedding={embeddingPlotted} />
          <AddRemoveCancel />
        </>
      ) : null}
    </>
  );
}

export default LearnTab;
