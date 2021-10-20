import { Box } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import SelectedPalette from '../Controls/Segment/SelectedPalette';
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
          The foreground is the label that we are adding the canvas. The foreground is highlighted
          with a translucent white. Tools that add to the labeling, like the brush or threshold,
          will add the foreground label. The background label is outlined in red.
        </Typography>
        <Typography variant='h5'>Foreground/Background Palette</Typography>
        <SelectedPalette />
        <Typography>
          This palette shows the selected foreground and background labels.
          <br />
          The white-outlined box outlined shows the foreground, and the red-outlined square shows
          the background.
          <br />
          Hover over either box to reveal buttons to change the selected labels. The shortcuts on
          the right are another option to change selected labels.
        </Typography>
        <Typography variant='h5'>Select Tool</Typography>
        <Typography>
          While using the Select tool, click on any label to select it as the foreground. Click on
          the foreground label to select it as the background. If you double click on a label, it
          also resets the foreground to no label.
          <br />
        </Typography>
        <Typography variant='h5'>
          Select with <kbd>Shift</kbd>
        </Typography>
        <Typography>
          While using any tool, you can select labels by holding <kbd>Shift</kbd> and clicking on
          it. Shift clicking on any label first selects it as the background, and shift clicking on
          the background makes it the foreground. Shift with a double click also resets the
          background to no label.
        </Typography>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
