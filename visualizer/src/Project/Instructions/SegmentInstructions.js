import { Box, Grid, Link } from '@mui/material';
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
        <Typography>These tools update the segmentation of the selected cell.</Typography>
        <Grid container spacing={3} justify='flex-start'>
          <Grid item sx={12}>
            <Typography variant='h5'>Write Mode</Typography>
            <Typography>
              Write mode controls how to combine changes with the existing segmentation.
              <br />
              Exclude, the default mode, only adds the selected cell where there are no other cells.
              <br />
              Overwrite replaces any existing cells with the selected cell.
              <br />
              Overlap adds the selected cell on top of existing cells.
            </Typography>
          </Grid>
        </Grid>
        <Typography variant='h5'>Tools</Typography>
        <Typography>
          Tools are used by pressing its button, pressing the shortcut key, pressing Enter, or by
          clicking on the selected cell on the canvas.
        </Typography>
        <Typography variant='h6'>Select</Typography>
        <Typography>Click on a cell with the Select tool to select it.</Typography>
        <Typography variant='h6'>Brush and Erase</Typography>
        <Typography>
          Brush and Erase enable pixel-level changes to cells, like correcting borders or adding a
          missing cell.
          <br />
          Brush adds the selected cell and Erase removes it.
          <br />
          Click and drag with Brush or Erase to edit the selected cell.
          <br />
          Change the size of the brush with <kbd>&uarr;</kbd> and <kbd>&darr;</kbd>.
        </Typography>
        <Typography variant='h6'>Trim</Typography>
        <Typography>
          Trim removes disconnected parts of a cell.
          <br />
          Click on cell to trim the pixels not connected to the clicked area.
        </Typography>
        <Typography variant='h6'>Flood</Typography>
        <Typography>
          Flood replaces a connected region of one cell with another cell.
          <br />
          Click on any cell to select it to flood, outlining the cell in red. Click again to flood
          it with the selected cell.
          <br />
          Hold <kbd>Shift</kbd> and click to select a different cell to flood.
        </Typography>
        <Typography variant='h6'>Threshold</Typography>
        <Typography>
          Threshold fills the brightest uncelled pixels within a box with the selected cell.
          <br />
          Click and drag to make a bounding box for thresholding.
          <br />
          Threshold cannot be used when color is on.
        </Typography>
        <Typography variant='h6'>Watershed</Typography>
        <Typography>
          Watershed splits a cell into multiple along the contours of the image with the{' '}
          <Link href={'wikipedia.org/wiki/Watershed_(image_processing)'}>watershed transform</Link>.
          <br />
          Click on a click to place seed point, then click elsewhere in the same cell to place
          another seed point and split into two cells.
          <br />
          Watershed cannot be used when color is on.
        </Typography>
        <Typography variant='h5'>Actions</Typography>
        <Typography>
          Actions edit the cell when pressing the action button or the keyboard shortcut.
        </Typography>
        <Typography variant='h5'>Autofit</Typography>
        <Typography>
          Autofit adjusts a cell to hug the nearest edges in the raw image, fixing an existing
          cell's boundary.
          <br />
          Autofit cannot be used when color is on.
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
