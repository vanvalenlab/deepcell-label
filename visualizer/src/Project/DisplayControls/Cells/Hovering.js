import { Box } from '@mui/material';
import React from 'react';
import { useHoveringCells } from '../../ProjectContext';
import Cell from './Cell';

function Hovering() {
  const cells = useHoveringCells();

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
          <Box sx={{ ml: 0.5, mb: 0.5 }}>
            <Cell cell={cell} key={cell} />
          </Box>
        ))}
    </Box>
  );
}

export default Hovering;
