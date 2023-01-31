import { Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import TrainingButtons from './TrainingButtons';
import { useChannelExpression } from '../../../ProjectContext';

function LearnTab() {
    
    const quantities = ['Mean', 'Total'];
    const [embedding, setEmbedding] = useState(0);
    const channelExpression = useChannelExpression();

    const handleVisualize = () => {
        channelExpression.send({ type: 'CALCULATE_UMAP', stat: quantities[embedding] });
    };

    return (
        <>
        <Grid item display='flex' alignItems='center' sx={{marginLeft: 1.4, marginTop: 1}}>
            <TextField
                select
                size='small'
                value={embedding}
                label='Embedding'
                onChange={(evt) => setEmbedding(evt.target.value)}
                sx={{width: 154.6}}>
                {quantities.map((opt, index) => (
                <MenuItem key={index} value={index}>
                    {opt}
                </MenuItem>
                ))}
            </TextField>
            <Button
                sx={{ marginLeft: 2, width: 154.6, height: 35 }}
                variant='contained'
                onClick={handleVisualize}
            >
                Visualize
            </Button>
        </Grid>
        <TrainingButtons />
        </>
    );
};

export default LearnTab;
