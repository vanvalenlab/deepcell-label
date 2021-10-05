import Typography from '@material-ui/core/Typography';
import React from 'react';

const CanvasInstructions = () => {
  return (
    <>
      <Typography variant='h5'>Navigate the Canvas</Typography>
      <Typography>
        Press <kbd>+</kbd> or scroll down to zoom in.
        <br />
        Press <kbd>-</kbd> or scroll up to zoom out.
        <br />
        Hold <kbd>Space</kbd> and click and drag to pan around the canvas. Click and drag can also
        pan when not using the Brush or Threshold tool.
      </Typography>
      <Typography variant='h5'>Canvas Borders</Typography>
      <Typography>
        The borders of the canvas help show where we are within an image.
        <br />
        If a border is white, we are along an edge of the image.
        <br />
        If a border is black, the image extends off-canvas in that direction and we can pan or zoom
        out to view it.
      </Typography>
      <Typography variant='h5'>Frames</Typography>
      <Typography>
        Press <kbd>A</kbd> and <kbd>D</kbd> cycle between the image frames if your file has
        multiple.
      </Typography>
    </>
  );
};

export default CanvasInstructions;
