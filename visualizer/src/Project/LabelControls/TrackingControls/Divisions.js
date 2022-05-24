import { Box, FormLabel } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useEditing, useLineage } from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

function Divisions() {
  const lineage = useLineage();
  const label = useSelector(lineage, (state) => state.context.selected);
  const division = useDivision(label);
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
        {division.parent ? <Division label={division.parent} /> : <DivisionFootprint />}
        <FormLabel>Daughters</FormLabel>
        {division.daughters.length > 0 || editing ? (
          <Division label={label} />
        ) : (
          <DivisionFootprint />
        )}
      </Box>
    </Box>
  );
}

export default Divisions;
