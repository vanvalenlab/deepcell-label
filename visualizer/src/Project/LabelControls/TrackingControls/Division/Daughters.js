import { Box } from '@mui/material';
import React from 'react';
import { useEditing } from '../../../ProjectContext';
import AddDaughter from './AddDaughter';
import Daughter from './Daughter';

function Daughters({ division }) {
  const { label, daughters, divisionFrame } = division;

  const editing = useEditing();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {daughters.map((daughter) => (
        <Daughter parent={label} daughter={daughter} divisionFrame={divisionFrame} key={daughter} />
      ))}
      {editing && <AddDaughter label={label} />}
    </Box>
  );
}

export default Daughters;
