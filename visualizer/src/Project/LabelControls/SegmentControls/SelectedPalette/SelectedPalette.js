import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import React from 'react';
import Hovering from './Hovering';
import SelectedBox from './SelectedBox';

function SelectedPalette() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel sx={{ mx: 1 }}>Selected</FormLabel>
      <SelectedBox />
      <FormLabel sx={{ mx: 1 }}>Hovering</FormLabel>
      <Hovering />
    </Box>
  );
}

export default SelectedPalette;
