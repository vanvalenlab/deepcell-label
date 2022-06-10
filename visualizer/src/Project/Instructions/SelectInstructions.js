import { Box, FormLabel, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import Hovering from '../DisplayControls/Cells/Hovering';
import NewCellButton from '../DisplayControls/Cells/Selected/NewCellButton';
import NextCellButton from '../DisplayControls/Cells/Selected/NextCellButton';
import PreviousCellButton from '../DisplayControls/Cells/Selected/PreviousCellButton';
import ResetCellButton from '../DisplayControls/Cells/Selected/ResetCellButton';
import Selected from '../DisplayControls/Cells/Selected/Selected';
import { Shortcut, Shortcuts } from './Shortcuts';

function SelectShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Select new label' shortcut='N' />
      <Shortcut text='Reset selected label ' shortcut='Esc' />
      <Shortcut text='Select previous label' shortcut='[' />
      <Shortcut text='Select next label' shortcut=']' />
    </Shortcuts>
  );
}

function SelectInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Grid container spacing={3}>
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
          <Grid item xs={2} display='flex' justifyContent='center'>
            <Box display='flex' flexDirection='column'>
              <FormLabel>Hovering</FormLabel>
              <Hovering />
            </Box>
          </Grid>
          <Grid item xs={10}>
            <Typography>Hover over a cell on the canvas to see what cell it is.</Typography>
          </Grid>
        </Grid>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
