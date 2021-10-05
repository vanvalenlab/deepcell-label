import Typography from '@material-ui/core/Typography';
import React from 'react';
import FeatureSelect from '../Controls/ImageControls/LabeledControls/FeatureSelect';
import HighlightToggle from '../Controls/ImageControls/LabeledControls/HighlightToggle';
import OpacitySlider from '../Controls/ImageControls/LabeledControls/OpacitySlider';
import OutlineToggle from '../Controls/ImageControls/LabeledControls/OutlineToggle';
import ColorModeToggle from '../Controls/ImageControls/RawControls/ColorModeToggle';
import GrayscaleControls from '../Controls/ImageControls/RawControls/GrayscaleControls';
import RGBControls from '../Controls/ImageControls/RawControls/RGBControls';

const DisplayInstructions = () => {
  return (
    <>
      <Typography>
        DeepCell Label can display a raw image and labels that segment the image into object. On the
        far left, you'll find controls to adjust how the images and labels are displayed. On top,
        you'll see segmentation controls to change how to show the labels, and on bottom, there are
        channels controls to change how to show the image.
      </Typography>
      <Typography variant='h5'>Segmentations</Typography>
      <FeatureSelect />
      <Typography>
        If a project has multiple segmentation features, like a whole-cell segmentation and a
        nuclear segmentation, you can select which feature to view in the feature drop-down. Press{' '}
        <kbd>F</kbd> to view the next feature and press <kbd>Shift</kbd> + <kbd>F</kbd> to view the
        previous feature.
      </Typography>
      <OutlineToggle />
      <Typography>
        The outline toggle controls where to outline all labels or only the selected labels.
        Pressing the hotkey <kbd>O</kbd> toggles the outline.
      </Typography>
      <OpacitySlider />
      <Typography>
        The opacity slider controls the transparency of the segmentation over of the raw image.
        Pressing the hotkey <kbd>Z</kbd> cycles between raw image only, labels overlaid on the raw
        image, and labels only.
      </Typography>
      <HighlightToggle />
      <Typography>
        The highlight toggle controls whether the selected label is colored red in the labels
        overlay.
      </Typography>
      <Typography variant='h5'>Channels </Typography>
      <ColorModeToggle />
      <Typography>
        The multi-channel toggle controls whether to view a single channel in grayscale or multiple
        channels each with different colors.
      </Typography>
      <Typography variant='h6'> Multi-channel mode </Typography>
      <RGBControls />
      <Typography>
        When the multi-channel toggle in on, you'll see a controller for each displayed channel.
        These controllers let you change which channel is display, toggle it on and off, and adjust
        the channels dynamic range. At the bottom, there is a button to display more channels. Each
        channel also has a pop-up options menu on its right side where you can remove the channel
        and change its color.{' '}
      </Typography>
      <Typography variant='h6'>Single-channel mode </Typography>
      <GrayscaleControls />
      <Typography>
        When viewing a single channel, you can instead change which channel to display and adjust
        its dynamic range, brightness and contrast. When in single-channel mode, press <kbd>C</kbd>{' '}
        to view the next channel and press <kbd>Shift</kbd> + <kbd>C</kbd> to view the previous
        channel. Press <kbd>I</kbd> to invert the channel. Press <kbd>0</kbd> (zero) to reset the
        dynamic range, brightness, and contrast.
      </Typography>
    </>
  );
};

export default DisplayInstructions;
