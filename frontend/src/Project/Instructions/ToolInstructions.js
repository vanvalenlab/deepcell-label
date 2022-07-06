import { Box, Link } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Shortcut, Shortcuts } from './Shortcuts';

function ToolShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Select' shortcut='V' />
      <Shortcut text='Brush' shortcut='B' />
      <Shortcut text='Erase' shortcut='E' />
      <Shortcut text='Increase brush size' shortcut='&uarr;' />
      <Shortcut text='Decrease brush size' shortcut='&darr;' />
      <Shortcut text='Trim' shortcut='K' />
      <Shortcut text='Flood' shortcut='G' />
      <Shortcut text='Watershed' shortcut='W' />
    </Shortcuts>
  );
}

function ToolInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography>
          Tools are used by clicking on the canvas.
          <br />
          To switch between tools, click on the Tools menu or use the shortcuts on the right.
        </Typography>
        <Typography variant='h5'>Select</Typography>
        <Typography>Click on a label with the Select tool to select it.</Typography>
        <Typography variant='h5'>Brush and Erase</Typography>
        <Typography>
          Brush and Erase can make detailed pixel-level changes to labels, like correcting label
          borders, draw labels from scratch, or remove labels entirely.
          <br />
          Brush adds the selected label and Erase removes it.
          <br />
          Click and drag to make a brush stroke, and release to fill the stroke with the selected
          label.
        </Typography>
        <Typography variant='h5'>Trim</Typography>
        <Typography>
          Trim removes disconnected parts of a label.
          <br />
          Click on label to trim the pixels not connected to the clicked area.
        </Typography>
        <Typography variant='h5'>Flood</Typography>
        <Typography>
          Flood fills a connected region of one label with another label.
          <br />
          Click on any label to select it to flood, then click again to flood it with the selected
          label. label. The label that will be flooded is outlined in red.
          <br />
          Hold <kbd>Shift</kbd> and click to change the label to be flooded.
        </Typography>
        <Typography variant='h5'>Threshold</Typography>
        <Typography>
          Threshold fills the brightest unlabeled pixels within a box with the selected label.
          <br />
          Click and drag to draw the bounding box.
        </Typography>
        <Typography variant='h5'>Watershed</Typography>
        <Typography>
          Watershed splits labels with multiple cells along cells' contours with the{' '}
          <Link href={'wikipedia.org/wiki/Watershed_(image_processing)'}>watershed transform</Link>.
          <br />
          Click on the center of one cell, then click on the center of another cell with the same
          label to split them into two labels.
        </Typography>
      </div>
      <ToolShortcuts />
    </Box>
  );
}

export default ToolInstructions;
