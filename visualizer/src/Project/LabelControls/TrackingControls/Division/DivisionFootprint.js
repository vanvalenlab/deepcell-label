import { Box } from '@mui/material';
import React from 'react';
import { ArcherContainer } from 'react-archer';
import Daughters from './Daughters';
import Parent from './Parent';

const dummyDivision = {
  parent: 1,
  daughters: [2, 3],
  t: 1,
};

function DivisionFootprint() {
  return (
    <Box sx={{ visibility: 'hidden ' }}>
      <ArcherContainer>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Parent division={dummyDivision} />
          <Daughters division={dummyDivision} />
        </Box>
      </ArcherContainer>
    </Box>
  );
}

export default DivisionFootprint;
