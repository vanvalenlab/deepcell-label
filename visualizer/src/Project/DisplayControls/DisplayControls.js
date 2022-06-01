import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import EditTabs from '../EditControls/EditTabs';
import { useImage } from '../ProjectContext';
import Cells from './Cells';
import ExportButton from './ExportButton';
import FrameControls from './FrameControls';
import LabeledControls from './LabeledControls';
import RawControls from './RawControls/RawControls';
import SpotsControls from './SpotsControls';
import TrackControls from './TrackControls';

function DisplayControls() {
  const image = useImage();
  const numFrames = useSelector(image, (state) => state.context.numFrames);

  return (
    <Box
      id='image-controls'
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ExportButton />
      <EditTabs />
      <Cells />
      {numFrames > 1 && <FrameControls />}
      {process.env.REACT_APP_CALIBAN_VISUALIZER === 'true' && <TrackControls />}
      {process.env.REACT_APP_SPOTS_VISUALIZER === 'true' && <SpotsControls />}
      <LabeledControls />
      <RawControls />
    </Box>
  );
}

export default DisplayControls;
