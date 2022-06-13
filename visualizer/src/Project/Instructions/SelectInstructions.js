import { Box, FormLabel, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import Hovering from '../DisplayControls/Cells/Hovering';
import NewCellButton from '../DisplayControls/Cells/Selected/NewCellButton';
import NextCellButton from '../DisplayControls/Cells/Selected/NextCellButton';
import PreviousCellButton from '../DisplayControls/Cells/Selected/PreviousCellButton';
import ResetCellButton from '../DisplayControls/Cells/Selected/ResetCellButton';
import Selected from '../DisplayControls/Cells/Selected/Selected';
import TimeControls from '../DisplayControls/TimeControls';
import { useImage } from '../ProjectContext';
import { Shortcut, Shortcuts } from './Shortcuts';

function SelectShortcuts() {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  return (
    <Shortcuts>
      <Shortcut text='Select new label' shortcut='N' />
      <Shortcut text='Reset selected label ' shortcut='Esc' />
      <Shortcut text='Select previous label' shortcut='[' />
      <Shortcut text='Select next label' shortcut=']' />
      {duration > 1 && <Shortcut text='Previous time' shortcut='A' />}
      {duration > 1 && <Shortcut text='Next time' shortcut='D' />}
    </Shortcuts>
  );
}

function SelectInstructions() {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>
              <Box display='inline-block'>
                <Selected />
              </Box>{' '}
              shows the selected cell. <PreviousCellButton /> and <NextCellButton /> cycle the
              selected cell, <NewCellButton />
              selects a new cell, and <ResetCellButton /> resets the selected cell.
            </Typography>
          </Grid>
          <Grid item xs={2} display='flex' flexDirection='column'>
            <FormLabel>Hovering</FormLabel>
            <Hovering />
          </Grid>
          <Grid item xs={10}>
            <Typography>Hover over a cell on the canvas to see what cell it is.</Typography>
          </Grid>
          {duration > 1 && (
            <>
              <Grid item xs={4} display='flex' justifyContent='center'>
                <TimeControls />
              </Grid>
              <Grid item xs={8}>
                <Typography>
                  Move between frames in a timelapse with this slider. Below the slider, there is a
                  timeline of which times the selected and hovering cells are present in.s
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
