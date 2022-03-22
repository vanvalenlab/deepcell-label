import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Shortcut, Shortcuts } from './Shortcuts';

function ActionShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Delete' shortcut='Backspace' />
      <Shortcut text='Autofit ' shortcut='M' />
      <Shortcut text='Shrink' shortcut='Q' />
      <Shortcut text='Grow' shortcut='Shift+Q' />
      <Shortcut text='Swap' shortcut='Shift+S' />
      <Shortcut text='Replace' shortcut='Shift+R' />
    </Shortcuts>
  );
}

function ActionInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography>
          Actions edit the selected labels without clicking on the canvas.
          <br />
          To do an action, press a button in the Actions menu or use its shortcut hotkey.
        </Typography>
        <Typography variant='h5'>Delete</Typography>
        <Typography>Delete removes a label from the frame, replacing it with no label.</Typography>
        <Typography variant='h5'>Autofit</Typography>
        <Typography>
          Autofit adjusts a label to hug the nearest edges in the raw image, fixing an existing
          label's boundary.
          <br />
          Autofit can only be used in single-channel mode as it fits the label to the channel.
        </Typography>
        <Typography variant='h5'>Shrink and Grow</Typography>
        <Typography>
          Shrink and grow contracts or expands a label's boundary by one pixel.
        </Typography>

        <Typography variant='h5'>Swap</Typography>
        <Typography>Swap can switch two labels to make them consistent between frames.</Typography>

        <Typography variant='h5'>Replace</Typography>
        <Typography>
          Replace combines two labels and can fix split labels that should be a single label.
        </Typography>
      </div>
      <ActionShortcuts />
    </Box>
  );
}

export default ActionInstructions;
