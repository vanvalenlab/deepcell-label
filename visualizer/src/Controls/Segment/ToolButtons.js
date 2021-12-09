import { FormLabel } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
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
