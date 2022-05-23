import SquareIcon from '@mui/icons-material/Square';
import SquareTwoToneIcon from '@mui/icons-material/SquareTwoTone';
import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import React from 'react';

function FrameStackIcon() {
  return (
    <>
      <SquareTwoToneIcon sx={{ position: 'absolute', right: 0, top: 0, zIndex: 0 }} />
      <SquareIcon sx={{ position: 'absolute', zIndex: -1, right: 0, top: 0, color: 'white' }} />
      <SquareTwoToneIcon sx={{ position: 'absolute', right: 3, top: 3, zIndex: -2 }} />
      <SquareIcon sx={{ position: 'absolute', right: 3, top: 3, zIndex: -3, color: 'white' }} />
      <SquareTwoToneIcon sx={{ position: 'absolute', right: 6, top: 6, zIndex: -4 }} />
      <SquareIcon sx={{ position: 'absolute', right: 6, top: 6, zIndex: -5, color: 'white' }} />
    </>
  );
}

function FrameModeButtons() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Frame Mode</FormLabel>
      <ToggleButtonGroup orientation='vertical'>
        <ToggleButton sx={{ px: 0.5, py: 0 }}>
          This Frame
          <SquareTwoToneIcon />
        </ToggleButton>
        <ToggleButton sx={{ px: 0.5, py: 0 }}>
          All Frames
          <FrameStackIcon />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default FrameModeButtons;
