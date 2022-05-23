import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import React from 'react';

function ToolButtons() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Tools</FormLabel>
      <ToggleButtonGroup orientation='vertical'>
        <ToggleButton sx={{ px: 0.5, py: 0 }}>Delete</ToggleButton>
        <ToggleButton sx={{ px: 0.5, py: 0 }}>Replace</ToggleButton>
        <ToggleButton sx={{ px: 0.5, py: 0 }}>Swap</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default ToolButtons;
