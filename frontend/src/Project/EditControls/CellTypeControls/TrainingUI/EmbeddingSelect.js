import { MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import TrainingButtons from './TrainingButtons';

function EmbeddingSelect() {
    
    const quantities = ['Mean', 'Total'];
    const [embedding, setEmbedding] = useState(0);

    return (
        <>
        <Grid item display='flex' sx={{marginLeft: 1.4, marginTop: 1}}>
            <TextField
                select
                size='small'
                value={embedding}
                label='Embedding'
                onChange={(evt) => setEmbedding(evt.target.value)}
                sx={{width: 325.5}}>
                {quantities.map((opt, index) => (
                <MenuItem key={index} value={index}>
                    {opt}
                </MenuItem>
                ))}
            </TextField>
        </Grid>
        <TrainingButtons quantities={quantities} embedding={embedding} />
        </>
    );
};

export default EmbeddingSelect;
