import { Box, FormLabel } from '@mui/material';
import React from 'react';
import { useDaughterDivisions, useParentDivisions, useSelectedCell } from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

function Divisions() {
  const cell = useSelectedCell();
  const parentDivisions = useParentDivisions(cell);
  const daughterDivisions = useDaughterDivisions(cell);

  return (
    <Box display='flex'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FormLabel>Parent</FormLabel>
        {daughterDivisions.map((d) => (
          <Division division={d} key={`parent${d.parent}daughters${d.daughters}`} />
        ))}
        {daughterDivisions.length === 0 && <DivisionFootprint />}
        <FormLabel>Daughters</FormLabel>
        {parentDivisions.map((d) => (
          <Division division={d} key={`parent${d.parent}daughters${d.daughters}`} />
        ))}
        {cell !== 0 && parentDivisions.length === 0 && (
          <Division division={{ parent: cell, daughters: [], t: null }} />
        )}
      </Box>
    </Box>
  );
}

export default Divisions;
