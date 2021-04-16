import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { useActor } from '@xstate/react';

import ControlRow from './ControlRow';


export default function ChannelControls({ channel }) {
  const [current, send] = useActor(channel);
  const { invert, grayscale, brightness, contrast } = current.context;

  const handleBrightnessChange = (event, newValue) => {
    send({ type: 'SETBRIGHTNESS', brightness: newValue });
  };

  const handleContrastChange = (event, newValue) => {
    send({ type: 'SETCONTRAST', contrast: newValue });
  };

  const handleInvertChange = (event) => {
    send({ type: 'TOGGLEINVERT' });
  };

  const handleGrayscaleChange = (event) => {
    send({ type: 'TOGGLEGRAYSCALE' });
  };

  return (
    <ControlRow name={"Raw Display"}>
      <ToggleButton
        value={invert}
        selected={invert}
        onChange={handleInvertChange}
      >
        Invert
      </ToggleButton>

      <ToggleButton
        value={grayscale}
        selected={grayscale}
        onChange={handleGrayscaleChange}
      >
        Grayscale
      </ToggleButton>
      
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
    </ControlRow>
  );
}
