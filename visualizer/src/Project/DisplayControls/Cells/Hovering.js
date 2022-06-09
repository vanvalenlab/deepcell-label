import { Box } from '@mui/material';
import React from 'react';
import { useHovering } from '../../ProjectContext';
import Cell from './Cell';

function Hovering() {
  const cells = useHovering();

  return (
    <Box
      display='flex'
      alignItems='center'
      justifyContent='center'
      flexDirection='row-reverse'
      flexWrap='wrap'
      maxWidth='9rem'
    >
      {!!cells &&
        cells.map((cell) => (
          <Box sx={{ ml: 0.5, mb: 0.5 }} key={cell}>
            <Cell cell={cell} />
          </Box>
        ))}
    </Box>
  );
}

export default Hovering;
