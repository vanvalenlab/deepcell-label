import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import EditTabs from '../EditControls/EditTabs';
import UndoRedo from '../EditControls/UndoRedo';
import { useImage } from '../ProjectContext';
import Cells from './Cells';
import ExportButton from './ExportButton';
import TimeControls from './TimeControls';

function DisplayControls() {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  return (
    <Box
      id='image-controls'
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ExportButton />
      <UndoRedo />
      <EditTabs />
      {duration > 1 && <TimeControls />}
      <Cells />
    </Box>
  );
}

export default DisplayControls;
