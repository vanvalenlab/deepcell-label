import { Box } from '@mui/material';
import React from 'react';
import { ArcherContainer } from 'react-archer';
import { useDivision } from '../../../ProjectContext';
import Daughters from './Daughters';
import Parent from './Parent';

function Division({ label }) {
  const division = useDivision(label);

  return (
    <ArcherContainer>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {division && <Parent division={division} />}
        {division && <Daughters division={division} />}
      </Box>
    </ArcherContainer>
  );
}

export default Division;
