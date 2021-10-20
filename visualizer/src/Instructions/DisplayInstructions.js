import { Box } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import FeatureSelect from '../Controls/ImageControls/LabeledControls/FeatureSelect';
import HighlightToggle from '../Controls/ImageControls/LabeledControls/HighlightToggle';
import OpacitySlider from '../Controls/ImageControls/LabeledControls/OpacitySlider';
import OutlineToggle from '../Controls/ImageControls/LabeledControls/OutlineToggle';
import ColorModeToggle from '../Controls/ImageControls/RawControls/ColorModeToggle';
import GrayscaleControls from '../Controls/ImageControls/RawControls/GrayscaleControls';
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
        <FeatureSelect />
        <Typography>
          If a project has multiple segmentation features, like a whole-cell segmentation and a
          nuclear segmentation, you can select which feature to view in the feature drop-down.
        </Typography>
        <OutlineToggle />
        <Typography>
          The outline toggle controls where to outline all labels or only the selected labels.
        </Typography>
        <OpacitySlider />
        <Typography>
          The opacity slider controls the transparency of the segmentation over of the raw image.
        </Typography>
        <HighlightToggle />
        <Typography>
          The highlight toggle controls whether the selected label is colored red in the labels
          overlay.
        </Typography>
        <Typography variant='h5'>Channels </Typography>
        <ColorModeToggle />
        <Typography>
          The multi-channel toggle controls whether to view a single channel in grayscale or
          multiple channels in color.
        </Typography>
        <Typography variant='h6'> Multi-channel mode </Typography>
        {/* <RGBControls /> */}
        <Typography>
          When the multi-channel toggle in on, you'll see a controller for each displayed channel.
          These controllers let you change the channel, toggle it on and off, and adjust its dynamic
          range. Double click on the slider to reset it. Each channel also has a pop-up options menu
          on its right side where you can remove the channel and change its color.
        </Typography>
        <Typography variant='h6'>Single-channel mode </Typography>
        <GrayscaleControls />
        <Typography>
          When viewing a single channel, you can instead change which channel to display and adjust
          its dynamic range, brightness and contrast. Double click on a slider to reset it.
        </Typography>
      </div>
      <DisplayShortcuts />
    </Box>
  );
};

export default DisplayInstructions;
