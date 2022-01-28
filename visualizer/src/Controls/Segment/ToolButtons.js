import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import makeStyles from '@mui/styles/makeStyles';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import React from 'react';
import BrushButton from './ToolButtons/BrushButton';
import EraserButton from './ToolButtons/EraserButton';
import FloodButton from './ToolButtons/FloodButton';
import SelectButton from './ToolButtons/SelectButton';
import ThresholdButton from './ToolButtons/ThresholdButton';
import TrimButton from './ToolButtons/TrimButton';
import WatershedButton from './ToolButtons/WatershedButton';

const useStyles = makeStyles((theme) => ({
  title: {
    margin: theme.spacing(1),
  },
}));

function ToolButtons() {
  const styles = useStyles();

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel className={styles.title}>Tools</FormLabel>
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
