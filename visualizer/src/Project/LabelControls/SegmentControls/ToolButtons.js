import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useBrush } from '../../ProjectContext';
import BrushButton from './ToolButtons/BrushButton';
import EraserButton from './ToolButtons/EraserButton';
import FloodButton from './ToolButtons/FloodButton';
import SelectButton from './ToolButtons/SelectButton';
import ThresholdButton from './ToolButtons/ThresholdButton';
import TrimButton from './ToolButtons/TrimButton';
import WatershedButton from './ToolButtons/WatershedButton';

function ToolButtons() {
  const brush = useBrush();
  const erase = useSelector(brush, (state) => state.context.erase);
  useEffect(() => {
    bind('x', () => brush.send({ type: 'SET_ERASE', erase: !erase }));
  }, [brush, erase]);

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Tools</FormLabel>
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
