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
      Hold <kbd>Space</kbd> and move the mouse on the canvas to pan around.
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
      Select Labels
    </Typography>
    <Typography>
      {/* The selected label is highlighted in red and outlined to distinguish it from other labels. */}
       <br />
      Click on a label to select, and click it again to unselect.
      <br />
      Press <kbd>Esc</kbd> to unselect the current label from anywhere.
    </Typography>
  </>;

};

export default CanvasInstructions;