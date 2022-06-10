import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import LabeledControls from '../DisplayControls/LabeledControls/LabeledControls';
import ColorModeToggle from '../DisplayControls/RawControls/ColorModeToggle';
import GrayscaleControls from '../DisplayControls/RawControls/GrayscaleControls';
import RGBControls from '../DisplayControls/RawControls/RGBControls';
import { useLabeled } from '../ProjectContext';
import { Shortcut, Shortcuts } from './Shortcuts';

function DisplayShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Toggle highlight' shortcut='H' />
      <Shortcut text='Cycle cells opacity' shortcut='Z' />
      <Shortcut text='Cycle outline opacity' shortcut='O' />
      <Shortcut text='Toggle multi-channel' shortcut='Y' />
      <Shortcut text='Next feature' shortcut='F' />
      <Shortcut text='Previous feature' shortcut='Shift+F' />
      <Shortcut text='Next frame' shortcut='D' />
      <Shortcut text='Previous frame' shortcut='A' />
      <Typography variant='h6' sx={{ whiteSpace: 'nowrap' }}>
        Single-channel mode only
      </Typography>
      <Shortcut text='Next channel' shortcut='C' />
      <Shortcut text='Previous channel' shortcut='Shift+C' />
      <Shortcut text='Invert channel' shortcut='I' />
      <Shortcut text='Reset channel' shortcut='0' />
    </Shortcuts>
  );
}

function DisplayInstructions() {
  const labeled = useLabeled();
  const numFeatures = useSelector(labeled, (state) => state.context.numFeatures);
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography>
          The canvas on the right shows segmentations overlaid on multi-channel images. These
          controls adjust how the images and segmentations.
        </Typography>
        <br />
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <LabeledControls />
            <br />
          </Grid>
          <Grid item xs={6}>
            <Typography component={'span'}>
              <ul style={{ margin: 0 }}>
                {numFeatures > 1 && (
                  <li>Feature switches between segmentations, like whole-cell and nuclear</li>
                )}
                <li>Red Highlight toggles making the selected cell red</li>
                <li>
                  Under Opacity,
                  <ul>
                    <li>Cells sets the opacity of the segmentation</li>
                    <li>Outline sets the opacity of cell outlines </li>
                  </ul>
                </li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
        <Typography variant='h5'>Channels </Typography>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <ColorModeToggle />
          </Grid>
          <Grid item xs={9}>
            <Typography>
              The multi-channel switch toggles showing a single channel in grayscale or multiple
              channels in color.
            </Typography>
          </Grid>
        </Grid>
        <br />
        <Typography variant='h6'> Multi-channel mode </Typography>
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <RGBControls />
          </Grid>
          <Grid item xs={8}>
            <Typography component={'span'}>
              In multi-channel mode,
              <ul>
                <li>switch channels with the dropdown,</li>
                <li>adjust the dynamic range with the slider,</li>
                <li>double click the slider to reset the range,</li>
                <li>toggle the channel with the checkbox, and</li>
                <li>change colors and remove channels with the pop-up menu.</li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
        <br />
        <Typography variant='h6'>Single-channel mode </Typography>
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <GrayscaleControls />
          </Grid>
          <Grid item xs={8}>
            <Typography component={'span'}>
              In single channel mode,
              <ul>
                <li>switch channels with the dropdown,</li>
                <li>adjust range, brightness and contrast with the sliders, </li>
                <li>double click a slider to reset it, and </li>
                <li>invert the channel with the toggle.</li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
      </div>
      <DisplayShortcuts />
    </Box>
  );
}

export default DisplayInstructions;
