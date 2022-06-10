import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Shortcut, Shortcuts } from './Shortcuts';

function CanvasShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Zoom out ' shortcut='-' />
      <Shortcut text='Zoom in' shortcut='=' />
    </Shortcuts>
  );
}

const CanvasInstructions = () => {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography variant='h5'>Navigate the Canvas</Typography>
        <Typography>
          Scroll down to zoom in.
          <br />
          Scroll up to zoom out.
          <br />
          Click and drag to pan around the canvas. Some tools disable panning, but you can pan by
          holding <kbd>Space</kbd>. Brush or Threshold).
        </Typography>
        <Typography variant='h5'>Canvas Borders</Typography>
        <Typography>
          Canvas borders change color to show its position within the whole image.
          <br />
          A white border means the canvas is along the edge of the image.
          <br />A black border means the image extends off-canvas, so the canvas can pan or zoom out
          in that direction.
        </Typography>
      </div>
      <CanvasShortcuts />
    </Box>
  );
};

export default CanvasInstructions;
