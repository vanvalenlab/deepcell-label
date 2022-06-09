import { Box } from '@mui/material';
import React from 'react';
import { ArcherContainer } from 'react-archer';
import Daughters from './Daughters';
import Parent from './Parent';

const dummyDivision = {
  label: 1,
  parent: 2,
  daughters: [3, 4],
  frames: [0],
  capped: true,
  divisionFrame: 0,
  parentDivisionFrame: 0,
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
