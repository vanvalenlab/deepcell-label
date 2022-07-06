import { Box } from '@mui/material';
import React from 'react';
import AddDaughter from './AddDaughter';
import Daughter from './Daughter';

function Daughters({ division }) {
  const { daughters } = division;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {daughters.map((d) => (
        <Daughter division={division} daughter={d} key={d} />
      ))}
      <AddDaughter division={division} />
    </Box>
  );
}

export default Daughters;
