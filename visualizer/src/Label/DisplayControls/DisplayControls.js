import { Box } from '@mui/material';
import React from 'react';
import DownloadButton from './DownloadButton';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';
import SpotsControls from './SpotsControls';
import SubmitButton from './SubmitButton';

const DisplayControls = () => {
  const search = new URLSearchParams(window.location.search);
  const download = search.get('download');

  return (
    <Box
      id='image-controls'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 1,
      }}
    >
      {download ? (
        <DownloadButton sx={{ width: '100%' }} />
      ) : (
        <SubmitButton sx={{ width: '100%' }} />
      )}
      <SpotsControls />
      <LabeledControls />
      <RawControls />
    </Box>
  );
};

export default DisplayControls;
