import React from 'react';
import Typography from '@material-ui/core/Typography';

function ToolInstructions() {
  return <>
    <Typography variant='h5'>
      Select
    </Typography>
    <Typography>
      Press <kbd>V</kbd> to use the Select tool.
      <br />
      Select picks labels for the foreground and background.
      <br />
      Click on a label to select it as the foreground, or
      double click on a label to select it as the background.
      <br />
      Double clicking also deselects the foreground.
    </Typography>
    <Typography variant='h5'>
      Brush
    </Typography>
    <Typography>
      Press <kbd>B</kbd> to use the Brush tool.
      <br />
      The Brush paints the foreground label over the background label.
      Other labels in the file won't be affected by the brush. 
      <br />
      The Brush can correct label borders, or draw labels from scratch. 
      The Brush is the most flexible tool to make pixel-level changes, 
      but also requires more work to get high-quality results.
      
      <br />
      Click and drag with the brush to paint a brush stroke. 
    </Typography>
    <Typography variant='h5'>
      Trim
    </Typography>
    <Typography>
      Press <kbd>K</kbd> to use the Trim tool.
      <br />
      Trim removes disconnected parts of a label, leaving behind only the area connected to where you click.
      <br />
      Click on any label to select it to trim,
      then click again to trim it.
    </Typography>
    <Typography variant='h5'>
      Flood
    </Typography>
    <Typography>
      Press <kbd>G</kbd> to use the Flood tool.
      <br />
      Flood fills a labeled region with another label.
      <br />
      Click on any label to select it to flood,
      then click again to flood it with the foreground label.
    </Typography>
    <Typography variant='h5'>
      Grow/Shrink
    </Typography>
    <Typography>
      Press <kbd>Q</kbd> to use the Grow/Shink tool.
      <br />
      Grow/Shrink expands or contracts the border of a label by one pixel.
      <br />
      Click on the foreground label to grow its border.
      <br />
      Click on the background label to shrink its border.
    </Typography>
    <Typography variant='h5'>
      Delete
    </Typography>
    <Typography>
      Press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to use the Delete tool.
      <br />
      Delete removes entire labels from the canvas.
      <br />
      Click on a label to select it to delete, then
      <br />
      click again to delete it.
    </Typography>
    <Typography variant='h4'>
      Single Channel Tools
    </Typography>
    <Typography>
      These tools use the raw image to change the labels, so they can
      only be used with a single channel.
      Switch to the single-channel grayscale mode with <kbd>Z</kbd>.
    </Typography>
    <Typography variant='h5'>
      Threshold
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
      Autofit
    </Typography>
    <Typography>
    Press <kbd>M</kbd> to use the Autofit tool.
    </Typography>
    <Typography variant='h5'>
      Watershed
    </Typography>
    <Typography>
    Press <kbd>W</kbd> to use the Watershed tool.
    </Typography>
    <Typography variant='h4'>
      Actions
    </Typography>
    <Typography>
      Actions are shown in the buttons below the toolbar
      and they edit the labels without clicking on the canvas.

      The Replace action makes all the pixels of the background label into the foreground label.
      The Swap action switches all the pixels of the foreground and the background labels.
    </Typography>
  </>;

};

export default ToolInstructions;