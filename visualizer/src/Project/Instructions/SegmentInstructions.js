import { Box, Link } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Shortcut, Shortcuts } from './Shortcuts';

function SegmentShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Select' shortcut='V' />
      <Shortcut text='Brush' shortcut='B' />
      <Shortcut text='Erase' shortcut='E' />
      <Shortcut text='Switch Brush and Erase' shortcut='X' />
      <Shortcut text='Increase brush size' shortcut='&uarr;' />
      <Shortcut text='Decrease brush size' shortcut='&darr;' />
      <Shortcut text='Trim' shortcut='K' />
      <Shortcut text='Flood' shortcut='G' />
      <Shortcut text='Watershed' shortcut='W' />
      <Shortcut text='Autofit ' shortcut='M' />
      <Shortcut text='Shrink' shortcut='Q' />
      <Shortcut text='Grow' shortcut='Shift+Q' />
    </Shortcuts>
  );
}

function SegmentInstructions() {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography variant='h2'>Write Mode</Typography>
        <Typography variant='h2'>Tools</Typography>
        <Typography>
          Tools are used by clicking on the canvas.
          <br />
          To switch between tools, click on the Tools menu or use the shortcuts on the right.
        </Typography>
        <Typography variant='h5'>Select</Typography>
        <Typography>Click on a cell with the Select tool to select it.</Typography>
        <Typography variant='h5'>Brush and Erase</Typography>
        <Typography>
          Brush and Erase can make detailed pixel-level changes to cells, like correcting cell
          borders, draw cells from scratch, or remove cells entirely.
          <br />
          Brush adds the selected cell and Erase removes it.
          <br />
          Click and drag to make a brush stroke, and release to fill the stroke with the selected
          cell.
        </Typography>
        <Typography variant='h5'>Trim</Typography>
        <Typography>
          Trim removes disconnected parts of a cell.
          <br />
          Click on cell to trim the pixels not connected to the clicked area.
        </Typography>
        <Typography variant='h5'>Flood</Typography>
        <Typography>
          Flood replaces a connected region of one cell with another cell.
          <br />
          Click on any cell to select it to flood, outlining the cell in red. Click again to flood
          it with the selected cell.
          <br />
          Hold <kbd>Shift</kbd> and click to select a different cell to flood.
        </Typography>
        <Typography variant='h5'>Threshold</Typography>
        <Typography>
          Threshold fills the brightest uncelled pixels within a box with the selected cell.
          <br />
          Click and drag to make a bounding box for thresholding.
        </Typography>
        <Typography variant='h5'>Watershed</Typography>
        <Typography>
          Watershed splits cells with multiple cells along cells' contours with the{' '}
          <Link href={'wikipedia.org/wiki/Watershed_(image_processing)'}>watershed transform</Link>.
          <br />
          Click on the center of one cell, then click on the center of another cell with the same
          cell to split them into two cells.
        </Typography>
        <Typography variant='h2'>Actions</Typography>
        <Typography>
          Actions edit the selected cells without clicking on the canvas.
          <br />
          To do an action, press a button in the Actions menu or use its shortcut hotkey.
        </Typography>
        <Typography variant='h5'>Delete</Typography>
        <Typography>Delete removes a cell from the frame, replacing it with no cell.</Typography>
        <Typography variant='h5'>Autofit</Typography>
        <Typography>
          Autofit adjusts a cell to hug the nearest edges in the raw image, fixing an existing
          cell's boundary.
          <br />
          Autofit can only be used in single-channel mode as it fits the cell to the channel.
        </Typography>
        <Typography variant='h5'>Shrink and Grow</Typography>
        <Typography>
          Shrink and grow contracts or expands a cell's boundary by one pixel.
        </Typography>
      </div>
      <SegmentShortcuts />
    </Box>
  );
}

export default SegmentInstructions;
