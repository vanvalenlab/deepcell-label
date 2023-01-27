import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import ModeButtons from '../EditControls/CellControls/ModeButtons';
import ToolButtons from '../EditControls/CellControls/ToolButtons';
import { Shortcut, Shortcuts } from './Shortcuts';

function ToolShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Select' shortcut='V' />
      <Shortcut text='Delete' shortcut='Backspace' />
      <Shortcut text='Combine' shortcut='R' />
      <Shortcut text='Swap' shortcut='S' />
      <Shortcut text='New' shortcut='N' />
    </Shortcuts>
  );
}

function CellsInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <Box>
        <Typography>Assign cells to the segmentation with the Cells tab.</Typography>
        <Typography variant='h5'>Mode</Typography>
        <Grid container spacing={3}>
          <Grid item xs={2}>
            <ModeButtons />
          </Grid>
          <Grid item xs={10}>
            <Typography>
              The mode controls how edit cells across the timelapse.
              <br />
              <strong>One</strong> edits the current time.
              <br />
              <strong>Past</strong> edits the start of the timelapse through the current time.
              <br />
              <strong>Future</strong> edits the current time through the end of the timelapse.
              <br />
              <strong>All</strong> edits the entire timelapse.
            </Typography>
          </Grid>
        </Grid>
        <Typography variant='h5'>Tools</Typography>
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <Typography component={'span'}>
              Tools can be used by
              <ul>
                <li>pressing its button in the toolbar</li>
                <li>pressing its shortcut key</li>
                <li>
                  pressing <kbd>Enter</kbd>
                </li>
                <li>clicking cells on the canvas</li>
              </ul>
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <ToolButtons />
          </Grid>
          <Grid item xs={6}>
            <Typography>
              <strong>Select</strong> picks the selected cell.
              <br />
              <strong>Delete</strong> removes the cell.
              <br />
              <strong>Combine</strong> combines a second cell with the selected cell. First selects
              a cell, and then selects the cell to replace.
              <br />
              <strong>Swap</strong> switches a second cell with the selected cell. First picks
              selects a cell, then selects the cell to swap.
              <br />
              <strong>New</strong> replaces the selected cell with a new cell.
            </Typography>
          </Grid>
        </Grid>
      </Box>
      <ToolShortcuts />
    </Box>
  );
}

export default CellsInstructions;
