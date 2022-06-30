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
        <Typography>Update the segmentation with controls in the Segment tab.</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant='h5'>Write Mode</Typography>
            <Typography component={'span'}>
              Controls how changes are added to the existing segmentation.
              <ul>
                <li>
                  <strong>Exclude</strong> adds the selected cell only in the background where there
                  are no other cells.
                </li>
                <li>
                  <strong>Overwrite</strong> replaces existing cells with the selected cell.
                </li>
                <li>
                  <strong>Overlap</strong> adds the selected cell on top of existing cells.
                </li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant='h5'>Tools</Typography>
            <Typography>
              Select a tool from the toolbar, then click on the canvas to use it.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Select</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>Picks the selected cell. Click a cell to select it.</Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Brush/Erase</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>
              Adds or removes area with brush strokes. Click and drag to make a brush stroke to edit
              the selected cell. Change the size of the brush with <kbd>&uarr;</kbd> and{' '}
              <kbd>&darr;</kbd>.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Trim</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>Removes disconnected parts of a cell. Click a cell to trim it.</Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Flood</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>
              Replaces a connected region of one cell with another cell. Click a cell to select it
              to flood, and click again to flood it. Hold <kbd>Shift</kbd> and click to select a
              different cell to flood.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Threshold</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>
              Fills the brightest pixels within a bounding box with a cell. Click and drag to create
              a box for thresholding. Cannot be used with multiple channels.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Watershed</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>
              Splits a cell into multiple along the contours of the image with the{' '}
              <Link href={'wikipedia.org/wiki/Watershed_(image_processing)'}>
                watershed transform
              </Link>
              . Click a cell to place seed point, then click in the same cell to place another seed
              point and split into two cells. Cannot be used with multiple channels.
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant='h5'>Actions</Typography>
            <Typography>
              Edit a cell by pressing an action button or a keyboard shortcut.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Autofit</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>
              Adjusts a cell to hug the nearest edges in the raw image, fixing an existing cell's
              boundary. Cannot be used with multiple channels.
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography variant='h6'>Shrink/Grow</Typography>
          </Grid>
          <Grid item xs={10}>
            <Typography>Contracts or expands a cell's boundary by one pixel.</Typography>
          </Grid>
        </Grid>
      </div>
      <SegmentShortcuts />
    </Box>
  );
}

export default SegmentInstructions;
