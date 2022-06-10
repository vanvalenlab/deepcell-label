import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import LabeledControls from '../DisplayControls/LabeledControls/LabeledControls';
import ColorModeToggle from '../DisplayControls/RawControls/ColorModeToggle';
import GrayscaleControls from '../DisplayControls/RawControls/GrayscaleControls';
import RGBControls from '../DisplayControls/RawControls/RGBControls';
import { useImage, useLabeled, useRaw } from '../ProjectContext';
import { Shortcut, Shortcuts } from './Shortcuts';

function DisplayShortcuts() {
  const labeled = useLabeled();
  const numFeatures = useSelector(labeled, (state) => state.context.numFeatures);

  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  const raw = useRaw();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);

  return (
    <Shortcuts>
      <Shortcut text='Toggle highlight' shortcut='H' />
      <Shortcut text='Cycle cells opacity' shortcut='Z' />
      <Shortcut text='Cycle outline opacity' shortcut='O' />
      <Shortcut text='Toggle multi-channel' shortcut='Y' />
      {numFeatures > 1 && <Shortcut text='Next feature' shortcut='F' />}
      {numFeatures > 1 && <Shortcut text='Previous feature' shortcut='Shift+F' />}
      {duration > 1 && <Shortcut text='Next time' shortcut='D' />}
      {duration > 1 && <Shortcut text='Previous time' shortcut='A' />}
      <Typography variant='h6' sx={{ whiteSpace: 'nowrap' }}>
        Single-channel mode only
      </Typography>
      {numChannels > 1 && <Shortcut text='Next channel' shortcut='C' />}
      {numChannels > 1 && <Shortcut text='Previous channel' shortcut='Shift+C' />}
      <Shortcut text='Invert channel' shortcut='I' />
      <Shortcut text='Reset channel' shortcut='0' />
    </Shortcuts>
  );
}

function DisplayInstructions() {
  const labeled = useLabeled();
  const numFeatures = useSelector(labeled, (state) => state.context.numFeatures);

  const raw = useRaw();
  const numChannels = useSelector(raw, (state) => state.context.numChannels);
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Typography>
          The canvas on the right shows segmentations overlaid on multi-channel images. These
          controls adjust how the images and segmentations.
        </Typography>
        <br />
        <Grid container spacing={3} justify='flex-start'>
          <Grid item xs={12} md={4}>
            <LabeledControls />
            <br />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography component={'span'}>
              <ul style={{ margin: 0 }}>
                {numFeatures > 1 && (
                  <li>Feature selects a segmentation, like whole-cell or nuclear</li>
                )}
                <li>Highlight toggles coloring the selected cell red</li>
                <li>Cells sets the opacity of the segmentation</li>
                <li>Outline sets the opacity of cell outlines </li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={4}>
          <Grid item xs={4}>
            <ColorModeToggle />
          </Grid>
          <Grid item xs={8}>
            <Typography>
              Toggles showing a single grayscale channel or multiple color channels
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <RGBControls />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography component={'span'}>
              When color is on,
              <ul>
                {numChannels > 1 && <li>the dropdown selects a channel</li>}
                <li>the slider adjusts the channels dynamic range</li>
                <li>double click the slider to reset the dynamic range</li>
                <li>the checkbox toggles the channel</li>
                <li>the pop-up menu picks a color colors or removes the channel</li>
              </ul>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <GrayscaleControls />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography component={'span'}>
              When color is off,
              <ul>
                {numChannels > 1 && <li>the dropdown selects a channel</li>}
                <li>the toggle invert the channel</li>
                <li>sliders adjust range, brightness and contrast </li>
                <li>double click a slider to reset it </li>
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
