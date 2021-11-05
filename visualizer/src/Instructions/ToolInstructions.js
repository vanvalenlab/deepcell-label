import { Box, Link } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
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
        <Typography>
          Select changes the foreground and background labels.
          <br />
          Click on a label to select the foreground, or double click on a label to select the
          background.
          <br />
          Double clicking also deselects other selected labels.
        </Typography>
        <Typography variant='h5'>Brush and Erase</Typography>
        <Typography>
          Brush and Erase can make detailed pixel-level changes to labels.
          <br />
          Use them to correct label borders, draw labels from scratch, or remove labels entirely.
          <br />
          Brush adds the selected label and Erase removes it.
          <br />
          With two labels selected, both Brush and Erase are on, replacing one label with another.
          <br />
          To edit a single label again, press the Brush or Eraser button.
          <br />
          Click and drag to make a brush stroke, and release to paint the selected labels within the
          stroke.
        </Typography>
        <Typography variant='h5'>Trim</Typography>
        <Typography>
          Trim removes disconnected parts of a label.
          <br />
          Click on label to trim the pixels not connected to the clicked area.
        </Typography>
        <Typography variant='h5'>Flood</Typography>
        <Typography>
          Flood fills a labeled region with another label.
          <br />
          Click on any label to select it to flood, then click again to flood it with the foreground
          label.
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
