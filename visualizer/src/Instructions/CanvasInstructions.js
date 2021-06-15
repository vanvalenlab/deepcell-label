import React from 'react';
import Typography from '@material-ui/core/Typography';

const CanvasInstructions = () => {
  return <>
    <Typography variant='h5'>
      Navigate the Canvas
    </Typography>
    <Typography>
      Press <kbd>+</kbd> or scroll down to zoom in.
      <br />
      Press <kbd>-</kbd> or scroll up to zoom out.
      <br />
      Hold <kbd>Space</kbd> and click and drag to pan around the canvas.
    </Typography>
    <Typography variant='h5'>
      Canvas Borders
    </Typography>
    <Typography>
      The borders of the canvas help show where we are within an image.
      <br />
      If a border is white, we are along an edge of the image.
      <br />
      If a border is black, the image extends off-canvas in that direction and we can pan or zoom out to view it.
    </Typography>
    <Typography variant='h5'>
      Frames
    </Typography>
    <Typography>
      Press <kbd>A</kbd> and <kbd>D</kbd> cycle between the image frames if your file has multiple.
    </Typography>
    <Typography variant='h5'>
      Segmentations
    </Typography>
    <Typography>
      Press <kbd>O</kbd> to toggle whether all labels are outlined.
      <br />
      Press <kbd>F</kbd> to cycle between segmentations if your file has multiple. 
      Press <kbd>Shift</kbd> + <kbd>F</kbd> cycles through segmentations in reverse.
      <br />
      Use the opacity slider to show the segmentation over the raw image.
    </Typography>
    <Typography variant='h5'>
      Channels
    </Typography>
    <Typography>
      Press <kbd>Z</kbd> to toggle whether to view a single channel in grayscale or multiple channels in color.
      <br />
      Press <kbd>C</kbd> to cycle between channels in grayscale.
      Press <kbd>Shift</kbd> + <kbd>C</kbd> cycles through channels in reverse.
      <br />
      Press <kbd>I</kbd> to invert channels when in grayscale.
    </Typography>
  </>;

};

export default CanvasInstructions;