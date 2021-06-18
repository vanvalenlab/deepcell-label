import Typography from '@material-ui/core/Typography';
import React from 'react';
import SelectedPalette, {
  SwapButton,
} from '../Controls/Toolbar/SelectedPalette';

function SelectInstructions() {
  return (
    <>
      <Typography variant='h5'>Foreground and Background</Typography>
      <Typography>
        The foreground is the label that we are adding the canvas. The
        foreground is highlighted with a translucent white. Tools that add to
        the labeling, like the brush or threshold, will add the foreground
        label. The background label is outlined in red. Tools that remove
        labeled areas, like trim or delete, selects a label as the background
        when clicking on it, and clicking on label selected as the background
        does the action that removes it.
      </Typography>
      <Typography variant='h5'>Foreground/Background Palette</Typography>
      <SelectedPalette />
      <Typography>
        Below the tool bar is a palette widget that shows the current foreground
        and background. The square outlined in white on top shows the
        foreground, and the square outline in red on bottom shows the
        background.
        <br />
        When the top square is black, the foregorund is no label. Tools will
        generally replace labeled area with unlabeled area.
        <br />
        When the bottom square is black, the background is no label. Tools will
        generally add new labeled area over unlabeled area.
        <br />
        We can switch the selected foreground and background by pressing{' '}
        <kbd>X</kbd> or by pressing the swap button <SwapButton />.
        <br />
        The foreground and background squares also have arrows to cycle between
        all the labels.
      </Typography>
      <Typography variant='h5'>Select Tool</Typography>
      <Typography>
        While using the Select tool, click on any label to select it as the
        foreground. Click on the foreground label to select it as the
        background. If you double click on a label, it also resets the
        foreground to no label.
        <br />
      </Typography>
      <Typography variant='h5'>
        Select with <kbd>Shift</kbd>
      </Typography>
      <Typography>
        While using any tool, you can select labels by holding <kbd>Shift</kbd>{' '}
        and clicking on it. Shift clicking on any label first selects it as the
        background, and shift clicking on the background makes it the
        foreground. Shift with a double click also resets the background to no
        label.
      </Typography>
    </>
  );
}

export default SelectInstructions;
