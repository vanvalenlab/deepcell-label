import { Box, Grid } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { Selected } from '../Controls/Segment/SelectedPalette';
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
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography variant='h5'>Foreground and Background</Typography>
        <Typography>
          We can select up to two labels to edit, first a foreground label and second a background
          label. Edits will add the foreground label and remove the background label.
          <br />
          The foreground label is filled with translucent white.
          <br />
          The background label is outlined in red.
        </Typography>
        <Typography variant='h5'>Foreground and Background Palette</Typography>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <Selected />
          </Grid>
          <Grid item xs={9}>
            <Typography>
              This palette shows the selected labels, with the foreground above and the background
              below.
              <br />
              Hover over the boxes to see buttons that change the selected labels. Keyboards
              shortcuts for these buttons are shown on the right.
            </Typography>
          </Grid>
        </Grid>

        <Typography variant='h5'>Selecting Labels</Typography>
        <Typography>
          As well as the buttons on the palette, we can select labels by clicking them on the
          canvas.
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
