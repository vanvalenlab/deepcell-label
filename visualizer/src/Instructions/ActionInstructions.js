import Typography from '@material-ui/core/Typography';
import React from 'react';

function ActionInstructions() {
  return (
    <>
      <Typography>
        Actions are shown in the buttons below the toolbar. Actions edit the selected labels without
        clicking on the canvas.
      </Typography>
      <Typography variant='h5'>Delete</Typography>
      <Typography>
        Delete removes a label from the frame, replacing it with no label. Press <kbd>Del</kbd> or{' '}
        <kbd>Backspace</kbd> to delete the selected label.
      </Typography>
      <Typography variant='h5'>Autofit</Typography>
      <Typography>
        Autofit adjusts a label to hug the nearest edges in the raw image, fixing an existing
        label's boundary. Autofit can only be used in single-channel mode because it uses the
        displayed channel to fit the label. Press <kbd>M</kbd> to autofit the selected label.
      </Typography>
      <Typography variant='h5'>Shrink and Grow</Typography>
      <Typography>
        Shrink and grow contracts or expands a label's boundary by one pixel. Press <kbd>Q</kbd> to
        shrink the selected label and press <kbd>Shift</kbd> + <kbd>Q</kbd> to grow the selected
        label.
      </Typography>

      <Typography variant='h5'>Swap</Typography>
      <Typography>
        Press <kbd>Shift</kbd> + <kbd>S</kbd> to swap the selected labels. Swap can switch two
        labels to make them consistent between frames.
      </Typography>

      <Typography variant='h5'>Replace</Typography>
      <Typography>
        Press <kbd>Shift</kbd> + <kbd>R</kbd> to combine selected labels. Replace combines two
        labels and can fix split labels that should be a single label.
      </Typography>
    </>
  );
}

export default ActionInstructions;
