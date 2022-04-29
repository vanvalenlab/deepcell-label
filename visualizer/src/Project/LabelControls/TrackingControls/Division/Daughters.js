import { Box } from '@mui/material';
import React from 'react';
import AddDaughter from './AddDaughter';
import Daughter from './Daughter';

function Daughters({ division }) {
  const { label, daughters, divisionFrame } = division;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {daughters.map((daughter) => (
        <Daughter label={label} daughter={daughter} divisionFrame={divisionFrame} key={daughter} />
      ))}
      <AddDaughter label={label} />
    </Box>
  );
}

export default Daughters;
