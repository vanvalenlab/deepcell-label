import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useLineage } from '../../ProjectContext';
import Hovering from './Hovering';
import Selected from './Selected';

function Cells() {
  const lineage = useLineage();
  const selected = useSelector(lineage, (state) => state.context.selected);
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
