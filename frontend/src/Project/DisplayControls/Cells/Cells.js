import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import React from 'react';
import HighlightToggle from '../LabeledControls/HighlightToggle';
import Hovering from './Hovering';
import Selected from './Selected';

function Cells() {
  return (
    <Box display='flex' flexDirection='column'>
      <HighlightToggle />
      <Box display='flex' justifyContent='space-between' width='100%' sx={{ gap: 1 }}>
        <FormLabel>Selected</FormLabel>
        <FormLabel>Hovering</FormLabel>
      </Box>
      <Box display='flex' justifyContent='space-between' width='100%'>
        <Selected />
        <Hovering />
      </Box>
    </Box>
  );
}

export default Cells;
