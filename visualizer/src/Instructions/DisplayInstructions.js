import { Box, Grid } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import FeatureSelect from '../Controls/ImageControls/LabeledControls/FeatureSelect';
import HighlightToggle from '../Controls/ImageControls/LabeledControls/HighlightToggle';
import OpacitySlider from '../Controls/ImageControls/LabeledControls/OpacitySlider';
import OutlineToggle from '../Controls/ImageControls/LabeledControls/OutlineToggle';
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
      <Typography variant='h6' style={{ whiteSpace: 'nowrap' }}>
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
        <Typography variant='h5'>Segmentations</Typography>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <FeatureSelect />
          </Grid>
          <Grid item xs={9}>
            <Typography>
              switches between segmentations, like whole-cell and nuclear segmentations
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <OutlineToggle />
          </Grid>
          <Grid item xs={9}>
            <Typography>
              outlines all labels when on, or only the selected labels when off
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <OpacitySlider />
          </Grid>
          <Grid item xs={9}>
            <Typography>overlays the labels on the channels</Typography>
          </Grid>
          <Grid item xs={3}>
            <HighlightToggle />
          </Grid>
          <Grid item xs={9}>
            <Typography>
              Highlights the foreground label in red when viewing the labels overlay
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
              Switches between displaying single channel in grayscale and multiple channels in color
            </Typography>
          </Grid>
        </Grid>
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
                <li>change colors and remove channels with the popup menu.</li>
              </ul>
            </Typography>
          </Grid>
        </Grid>

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
