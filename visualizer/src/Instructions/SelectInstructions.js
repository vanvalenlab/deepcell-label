import { Box, Grid } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { Selected } from '../Controls/Segment/SelectedPalette';
import { useLabeled } from '../ProjectContext';
import { Shortcut, Shortcuts } from './Shortcuts';

function SelectShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='New label' shortcut='N' />
      <Shortcut text='Unselect ' shortcut='Esc' />
      <Shortcut text='Previous foreground' shortcut='[' />
      <Shortcut text='Next foreground' shortcut=']' />
      <Shortcut text='Previous background' shortcut='Shift+[' />
      <Shortcut text='Next background' shortcut='Shift+]' />
    </Shortcuts>
  );
}

function SelectInstructions() {
  const labeled = useLabeled();
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography variant='h5'>Foreground and Background</Typography>
        <Typography>
          We can select up to two labels to edit, a foreground label and a background label.
          <br />
          Edits add the foreground label and remove the background label.
          <br />
          The canvas shows the foreground label in translucent white.
          <br />
          The canvas outlines the background label in red.
        </Typography>
        <Typography variant='h5'>Foreground and Background Palette</Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={4} md={2}>
            {labeled && <Selected />}
          </Grid>
          <Grid item xs={6} sm={8} md={10}>
            <Typography>
              Here are the selected labels, with the foreground above and the background below.
              <br />
              Use the buttons within the boxes to cycle, reset, or select a new label.
            </Typography>
          </Grid>
        </Grid>
        <Typography variant='h5'>Selecting Labels</Typography>
        <Typography>
          Click on labels on the canvas to select them.
          <br />
          While using the Select tool,
          <ul>
            <li>click to select the foreground</li>
            <li>double click to select the background</li>
            <li>click on a selected label to swap the foreground and background</li>
          </ul>
          While using any tool, hold <kbd>Shift</kbd> and
          <ul>
            <li>click to select the background</li>
            <li>double click to select the foreground</li>
            <li>click on a select label to swap the foreground and background</li>
          </ul>
        </Typography>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
