import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { useSelector } from '@xstate/react';

import ControlRow from './ControlRow';

const InvertButton = ({ channel }) => {
  const invert = useSelector(channel, state => state.context.invert);

  const handleInvertChange = (event) => {
    channel.send({ type: 'TOGGLEINVERT' });
  };

  return <ToggleButton
    value={invert}
    selected={invert}
    onChange={handleInvertChange}
  >
    Invert
  </ToggleButton>;
};

const GrayscaleButton = ({ channel }) => {
  const grayscale = useSelector(channel, state => state.context.grayscale);

  const handleGrayscaleChange = (event) => {
    channel.channelsend({ type: 'TOGGLEGRAYSCALE' });
  };

  return <ToggleButton
    value={grayscale}
    selected={grayscale}
    onChange={handleGrayscaleChange}
  >
    Grayscale
  </ToggleButton>;
};

const BrightnessSlider = ({ channel }) => {
  const brightness = useSelector(channel, state => state.context.brightness);

  const handleBrightnessChange = (event, newValue) => {
    send({ type: 'SETBRIGHTNESS', brightness: newValue });
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
  const contrast = useSelector(channel, state => state.context.contrast);

  const handleContrastChange = (event, newValue) => {
    send({ type: 'SETCONTRAST', contrast: newValue });
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


const ChannelControls = ({ channel }) => {
  return (
    <ControlRow name={"Raw Display"}>
      <InvertButton channel={channel} />
      <GrayscaleButton channel={channel} />
      <BrightnessSlider channel={channel} />
      <ContrastSlider channel={channel} />
    </ControlRow>
  );
}

export default React.memo(ChannelControls);