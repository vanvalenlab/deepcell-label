import { Box } from '@mui/material';
import React from 'react';
import { useEditing } from '../../../ProjectContext';
import AddDaughter from './AddDaughter';
import Daughter from './Daughter';

function Daughters({ division }) {
  const editing = useEditing();
  const { daughters } = division;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {daughters.map((d) => (
        <Daughter division={division} daughter={d} key={d} />
      ))}
      {editing && <AddDaughter division={division} />}
    </Box>
  );
}

export default Daughters;
