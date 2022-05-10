import { Box } from '@mui/material';
import React from 'react';
import DownloadButton from './DownloadButton';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';
import SpotsControls from './SpotsControls';
import SubmitButton from './SubmitButton';
import TrackControls from './TrackControls';

function DisplayControls() {
  const search = new URLSearchParams(window.location.search);
  const download = search.get('download');

  return (
    <Box
      id='image-controls'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 1,
      }}
    >
      {download ? (
        <DownloadButton sx={{ width: '100%' }} />
      ) : (
        <SubmitButton sx={{ width: '100%' }} />
      )}
      {process.env.REACT_APP_CALIBAN_VISUALIZER === 'true' && <TrackControls />}
      {process.env.REACT_APP_SPOTS_VISUALIZER === 'true' && <SpotsControls />}
      <LabeledControls />
      <RawControls />
    </Box>
  );
}

export default DisplayControls;
