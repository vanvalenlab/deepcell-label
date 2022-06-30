import CircleIcon from '@mui/icons-material/Circle';
import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import { Box } from '@mui/material';
import React from 'react';

function OverwriteIcon() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CircleTwoToneIcon sx={{ position: 'absolute', left: '50%', zIndex: -1, color: 'gray' }} />
      <CircleIcon sx={{ position: 'absolute', zIndex: 0, color: 'white' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', zIndex: 1, color: 'black' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', right: '50%', zIndex: -1, color: 'gray' }} />
    </Box>
  );
}

export default OverwriteIcon;
