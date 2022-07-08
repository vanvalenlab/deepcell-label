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
          Click and drag to pan around the canvas. If panning is disabled by a tool, hold{' '}
          <kbd>Space</kbd> to pan.
        </Typography>
        <Typography variant='h5'>Canvas Borders</Typography>
        <Typography>
          The canvas borders show whether the displayed area is on the edge of the image. When the
          border is white, the canvas is on the edge. When the border is black, the image extends
          off-canvas, so we can pan or zoom out in that direction.
        </Typography>
      </div>
      <CanvasShortcuts />
    </Box>
  );
};

export default CanvasInstructions;
