import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { useSelector } from '@xstate/react';

import ControlRow from './ControlRow';
import { useChannel, useImage } from '../ServiceContext';

const InvertButton = () => {
  const image = useImage();
  const invert = useSelector(image, state => state.context.invert);

  const handleInvertChange = (event) => {
    image.send({ type: 'TOGGLEINVERT' });
  };

  return <ToggleButton
    value={invert}
    selected={invert}
    onChange={handleInvertChange}
  >
    Invert
  </ToggleButton>;
};

const GrayscaleButton = () => {
  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  const handleGrayscaleChange = (event) => {
    image.send({ type: 'TOGGLEGRAYSCALE' });
  };

  return <ToggleButton
    value={grayscale}
    selected={grayscale}
    onChange={handleGrayscaleChange}
  >
    Grayscale
  </ToggleButton>;
};

const BrightnessSlider = () => {
  const channel = useChannel();
  const brightness = useSelector(channel, state => state.context.brightness);

  const handleBrightnessChange = (event, newValue) => {
    channel.send({ type: 'SETBRIGHTNESS', brightness: newValue });
  };

  return <>
    <Typography gutterBottom>
      Brightness
    </Typography>
    <Slider
      value={brightness}
      valueLabelDisplay="auto"
      min={-1}
      max={1}
      step={0.01}
      onChange={handleBrightnessChange}
      onDoubleClick={() => handleBrightnessChange('', 0)}
    />
  </>;
};

const ContrastSlider = () => {
  const channel = useChannel();
  const contrast = useSelector(channel, state => state.context.contrast);

  const handleContrastChange = (event, newValue) => {
    channel.send({ type: 'SETCONTRAST', contrast: newValue });
  };

  return <>
    <Typography gutterBottom>
      Contrast
    </Typography>
    <Slider
      value={contrast}
      valueLabelDisplay="auto"
      min={-1}
      max={1}
      step={0.01}
      onChange={handleContrastChange}
      onDoubleClick={() => handleContrastChange('', 0)}
    />
  </>;
};


const ChannelControls = () => {
  const channel = useChannel();

  return <ControlRow name={"Raw Display"}>
    <InvertButton />
    <GrayscaleButton />
    {channel && <BrightnessSlider />}
    {channel && <ContrastSlider />}
  </ControlRow>;
}

export default ChannelControls;