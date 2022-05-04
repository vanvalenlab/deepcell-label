import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import SelectedBox from '../LabelControls/SegmentControls/SelectedPalette/SelectedBox';
import { Shortcut, Shortcuts } from './Shortcuts';

function SelectShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='New label' shortcut='N' />
      <Shortcut text='Unselect ' shortcut='Esc' />
      <Shortcut text='Select previous label' shortcut='[' />
      <Shortcut text='Select next label' shortcut=']' />
    </Shortcuts>
  );
}

function SelectInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography variant='h5'>Selected Label Palette</Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={4} md={2}>
            <SelectedBox />
          </Grid>
          <Grid item xs={6} sm={8} md={10}>
            <Typography>
              This box shows the selected label and has controls to cycle, reset, or select a new
              label.
            </Typography>
          </Grid>
        </Grid>
        <Typography variant='h5'>Selecting Labels</Typography>
        <Typography>
          Click on labels on the canvas to select them.
          <br />
          While using the Select tool, click to select a label.
        </Typography>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
