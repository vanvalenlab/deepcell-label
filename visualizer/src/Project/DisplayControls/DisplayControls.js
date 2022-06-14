import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import EditTabs from '../EditControls/EditTabs';
import { useEditing, useImage } from '../ProjectContext';
import Cells from './Cells';
import ExportButton from './ExportButton';
import LabeledControls from './LabeledControls';
import RawControls from './RawControls/RawControls';
import TimeControls from './TimeControls';
import TrackControls from './TrackControls';

function DisplayControls() {
  const editing = useEditing();
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
      {editing && <EditTabs />}
      <Cells />
      {duration > 1 && <TimeControls />}
      {process.env.REACT_APP_CALIBAN_VISUALIZER === 'true' && <TrackControls />}
      <LabeledControls />
      <RawControls />
    </Box>
  );
}

export default DisplayControls;
