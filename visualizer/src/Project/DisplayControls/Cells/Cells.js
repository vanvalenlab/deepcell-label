import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import React from 'react';
import Hovering from './Hovering';
import Selected from './Selected';

function Cells() {
  return (
    <Box display='flex' flexDirection='column'>
      <Box display='flex' justifyContent='space-between' width='100%'>
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
