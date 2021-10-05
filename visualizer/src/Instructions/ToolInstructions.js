import Typography from '@material-ui/core/Typography';
import React from 'react';
import BrushButton from '../Controls/Segment/ToolButtons/BrushButton';
import EraserButton from '../Controls/Segment/ToolButtons/EraserButton';
import FloodButton from '../Controls/Segment/ToolButtons/FloodButton';
import SelectButton from '../Controls/Segment/ToolButtons/SelectButton';
import ThresholdButton from '../Controls/Segment/ToolButtons/ThresholdButton';
import TrimButton from '../Controls/Segment/ToolButtons/TrimButton';
import WatershedButton from '../Controls/Segment/ToolButtons/WatershedButton';

function ToolInstructions() {
  return (
    <>
      <Typography variant='h5'>
        <SelectButton />
      </Typography>
      <Typography>
        Press <kbd>V</kbd> to use the Select tool.
        <br />
        Select picks labels for the foreground and background.
        <br />
        Click on a label to select it as the foreground, or double click on a label to select it as
        the background.
        <br />
        Double clicking also deselects other labels..
      </Typography>
      <Typography variant='h5'>
        <BrushButton /> and <EraserButton />
      </Typography>
      <Typography>
        Press <kbd>B</kbd> to use the Brush and press <kbd>E</kbd> to use the Eraser.
        <br />
        Click and drag to create a brush stroke, and release to paint or erase the label under the
        brush stroke.
        <br />
        The brush and eraser allow for flexible pixel-level changes to labels, but they requires
        more work to get high-quality labels. The brush adds the selected label, and the eraser
        remove it. They can correct label borders, or draw labels from scratch, or remove them
        entirely.
        <br />
        Adjust the brush size with <kbd>&uarr;</kbd> to increase the size and <kbd>&darr;</kbd> to
        decrease the size.
        <br />
        When two labels are selected, you can use both the Brush and Eraser at the same time to
        replace one label with another. Pressing the Brush or Eraser buttons or hotkeys will
        unselect one of the labels to paint or erase a single label again.
      </Typography>
      <Typography variant='h5'>
        <TrimButton />
      </Typography>
      <Typography>
        Press <kbd>K</kbd> to use the Trim tool.
        <br />
        Trim removes disconnected parts of a label, leaving behind only the area connected to where
        you click.
        <br />
        Click on any label to select it to trim, then click again to trim it.
      </Typography>
      <Typography variant='h5'>
        <FloodButton />
      </Typography>
      <Typography>
        Press <kbd>G</kbd> to use the Flood tool.
        <br />
        Flood fills a labeled region with another label.
        <br />
        Click on any label to select it to flood, then click again to flood it with the foreground
        label.
      </Typography>
      <Typography variant='h5'>
        <ThresholdButton />
      </Typography>
      <Typography>
        Press <kbd>T</kbd> to use the Threshold tool.
        <br />
        Threshold fills the brightest pixels within a label.
        <br />
        Threshold adds the foreground label only to unlabeled areas.
        <br />
        Click and drag to draw a bounding box for thresholding.
      </Typography>
      <Typography variant='h5'>
        <WatershedButton />
      </Typography>
      <Typography>
        Press <kbd>W</kbd> to use the Watershed tool.
      </Typography>
    </>
  );
}

export default ToolInstructions;
