import { Box, FormLabel } from '@mui/material';
import React from 'react';
import {
  useDaughterDivision,
  useEditing,
  useParentDivision,
  useSelectedCell,
} from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

function Divisions() {
  const cell = useSelectedCell();
  const parentDivision = useParentDivision(cell);
  const daughterDivision = useDaughterDivision(cell);
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
        {daughterDivision ? <Division division={daughterDivision} /> : <DivisionFootprint />}
        <FormLabel>Daughters</FormLabel>
        {parentDivision ? <Division division={parentDivision} /> : <DivisionFootprint />}
      </Box>
    </Box>
  );
}

export default Divisions;
