import { Box, Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { useChannelExpression } from '../../../ProjectContext';
import CalculateWholeToggle from './CalculateWholeToggle';

function Calculate() {
  const channelExpression = useChannelExpression();
  const quantities = ['Mean', 'Total'];
  const [stat, setStat] = useState(0);

  const handleCalculation = () => {
    channelExpression.send({ type: 'CALCULATE', stat: quantities[stat], whole: true });
  };

  return (
    <>
      <Grid item display='flex'>
        <TextField
          select
          size='small'
          value={stat}
          label='Statistic'
          onChange={(evt) => setStat(evt.target.value)}
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
        <Button sx={{ width: '97%' }} variant='contained' onClick={handleCalculation}>
          Calculate
        </Button>
      </Grid>
    </>
  );
}

export default Calculate;
