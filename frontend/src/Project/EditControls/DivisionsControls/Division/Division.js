import { Box } from '@mui/material';
import React from 'react';
import { ArcherContainer } from 'react-archer';
import Daughters from './Daughters';
import Parent from './Parent';

function Division({ division }) {
  return (
    <ArcherContainer>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Parent division={division} />
        <Daughters division={division} />
      </Box>
    </ArcherContainer>
  );
}

export default Division;
