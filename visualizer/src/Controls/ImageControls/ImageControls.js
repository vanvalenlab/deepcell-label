import { Box } from '@mui/material';
import React from 'react';
import { useLabeled, useRaw } from '../../ProjectContext';
import DownloadButton from './DownloadButton';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';
import SubmitButton from './SubmitButton';

const ImageControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  const search = new URLSearchParams(window.location.search);
  const download = search.get('download');

  return (
    <Box
      id='image-controls'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 1,
      }}
    >
      {download ? (
        <DownloadButton sx={{ width: '100%' }} />
      ) : (
        <SubmitButton sx={{ width: '100%' }} />
      )}
      {labeled && <LabeledControls />}
      {raw && <RawControls />}
    </Box>
  );
};

export default ImageControls;
