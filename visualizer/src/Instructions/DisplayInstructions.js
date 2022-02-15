import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import LabeledControls from '../Controls/ImageControls/LabeledControls/LabeledControls';
import ColorModeToggle from '../Controls/ImageControls/RawControls/ColorModeToggle';
import GrayscaleControls from '../Controls/ImageControls/RawControls/GrayscaleControls';
import RGBControls from '../Controls/ImageControls/RawControls/RGBControls';
import { Shortcut, Shortcuts } from './Shortcuts';

function DisplayShortcuts() {
  return (
    <Shortcuts>
      <Shortcut text='Toggle outlines' shortcut='O' />
      <Shortcut text='Toggle highlight' shortcut='H' />
      <Shortcut text='Cycle opacity' shortcut='Z' />
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

const DisplayInstructions = () => {
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography>
          DeepCell Label can display a raw image and labels that segment the image into object. On
          the far left, you'll find controls to adjust how the images and labels are displayed. On
          top, you'll see segmentation controls to change how to show the labels, and on bottom,
          there are channels controls to change how to show the image.
        </Typography>
        <br />
        <Typography variant='h5'>Segmentations</Typography>
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <LabeledControls />
            <br />
          </Grid>
          <Grid item xs={8}>
            <Typography>
              <ul style={{ margin: 0 }}>
                <li>Feature switches segmentations, like whole-cell and nuclear</li>
                <li>Outline toggles outlining all labels or only selected labels</li>
                <li>Opacity overlays the labels on the channels</li>
                <li>Highlight colors the foreground label red</li>
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
            <Typography>
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
            <Typography>
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
};

export default DisplayInstructions;
