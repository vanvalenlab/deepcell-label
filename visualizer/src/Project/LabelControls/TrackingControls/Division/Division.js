import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ArcherContainer } from 'react-archer';
import { useTracking } from '../../ProjectContext';
import Daughters from './Daughters';
import Parent from './Parent';

function Division({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, (state) => state.context.labels[label]);

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
