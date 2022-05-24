import { Box, FormLabel } from '@mui/material';
import React from 'react';
import { useDivision, useEditing, useSelectedCell } from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

function Divisions() {
  const cell = useSelectedCell();
  const division = useDivision(cell);
  const editing = useEditing();

  return (
    <Box display='flex'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FormLabel>Parent</FormLabel>
        {division.parent ? <Division cell={division.parent} /> : <DivisionFootprint />}
        <FormLabel>Daughters</FormLabel>
        {/* division.label is undefined for dummy divisions (background/new cells) */}
        {(division.daughters.length > 0 || editing) && division.label ? (
          <Division cell={cell} />
        ) : (
          <DivisionFootprint />
        )}
      </Box>
    </Box>
  );
}

export default Divisions;
