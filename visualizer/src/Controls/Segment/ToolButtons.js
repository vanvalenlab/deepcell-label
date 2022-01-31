import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import React from 'react';
import BrushButton from './ToolButtons/BrushButton';
import EraserButton from './ToolButtons/EraserButton';
import FloodButton from './ToolButtons/FloodButton';
import SelectButton from './ToolButtons/SelectButton';
import ThresholdButton from './ToolButtons/ThresholdButton';
import TrimButton from './ToolButtons/TrimButton';
import WatershedButton from './ToolButtons/WatershedButton';

function ToolButtons() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel sx={{ margin: 1 }}>Tools</FormLabel>
      <ToggleButtonGroup orientation='vertical'>
        <SelectButton />
        <BrushButton />
        <EraserButton />
        <TrimButton />
        <FloodButton />
        <ThresholdButton />
        <WatershedButton />
      </ToggleButtonGroup>
    </Box>
  );
}

export default ToolButtons;
