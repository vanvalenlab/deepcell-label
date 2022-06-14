import { Box } from '@mui/material';
import React from 'react';
import { useHovering } from '../../ProjectContext';
import Cell from './Cell';

function Hovering() {
  const cells = useHovering();

  const noCells = !cells || cells.length === 0;

  return (
    <Box
      display='flex'
      alignItems='center'
      justifyContent='center'
      flexDirection='column'
      flexWrap='wrap'
      maxWidth='9rem'
    >
      {noCells ? (
        <Box sx={{ ml: 0.5, mb: 0.5, visibility: 'hidden' }}>
          <Cell cell={1} />
        </Box>
      ) : (
        cells.map((cell) => (
          <Box sx={{ ml: 0.5, mb: 0.5 }} key={cell}>
            <Cell cell={cell} />
          </Box>
        ))
      )}
    </Box>
  );
}

export default Hovering;
