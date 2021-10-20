import Typography from '@material-ui/core/Typography';
import React from 'react';

function ActionInstructions() {
  return (
    <>
      <Typography>
        Actions edit the selected labels without clicking on the canvas.
        <br />
        To do an action, press a button in the Actions menu or use its keybind.
      </Typography>
      <Typography variant='h5'>Delete</Typography>
      <Typography>
        Delete removes a label from the frame, replacing it with no label.
        <br />
        Press <kbd>Del</kbd> or <kbd>Backspace</kbd> to delete the selected label.
      </Typography>
      <Typography variant='h5'>Autofit</Typography>
      <Typography>
        Autofit adjusts a label to hug the nearest edges in the raw image, fixing an existing
        label's boundary.
        <br />
        Autofit can only be used in single-channel mode as it fits the label to the channel.
        <br />
        Press <kbd>M</kbd> to autofit the selected label.
      </Typography>
      <Typography variant='h5'>Shrink and Grow</Typography>
      <Typography>
        Shrink and grow contracts or expands a label's boundary by one pixel.
        <br />
        Press <kbd>Q</kbd> to shrink the selected label and press <kbd>Shift</kbd> + <kbd>Q</kbd> to
        grow the selected label.
      </Typography>

      <Typography variant='h5'>Swap</Typography>
      <Typography>
        Swap can switch two labels to make them consistent between frames.
        <br />
        Press <kbd>Shift</kbd> + <kbd>S</kbd> to swap the selected labels.
      </Typography>

      <Typography variant='h5'>Replace</Typography>
      <Typography>
        Replace combines two labels and can fix split labels that should be a single label.
        <br />
        Press <kbd>Shift</kbd> + <kbd>R</kbd> to combine selected labels.
      </Typography>
    </>
  );
}

export default ActionInstructions;
