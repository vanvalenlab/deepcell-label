import React from 'react';
import { useActor } from '@xstate/react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Box from '@material-ui/core/Box';

import ControlRow from './ControlRow';


export default function FeatureControls({ feature }) {

  const [current, send] = useActor(feature);
  const { highlight, showNoLabel, opacity, outline } = current.context;

  const handleHighlightChange = () => {
    // send({ type: 'SETHIGHLIGHT', value: !current.highlight });
  };

  const handleOutlineChange = (event, newValue) => {
    send({ type: 'SETOUTLINE', outline: newValue });
  };

  const handleOpacityChange = (event, newValue) => {
    send({ type: 'SETOPACITY', opacity: newValue });
  };

  const handleShowNoLabelChange = () => {
    send({ type: 'TOGGLESHOWNOLABEL' });
  };

  return (
    <ControlRow name={"Label Display"}>
      <Box display='flex' flexDirection='column'>
        <ToggleButton
          selected={highlight}
          onChange={handleHighlightChange}
        >
          Highlight
        </ToggleButton>
        <ToggleButton
          selected={!showNoLabel}
          onChange={handleShowNoLabelChange}
        >
          Show Background
        </ToggleButton>
        <FormControl component="fieldset">
          <FormLabel component="legend">Outline</FormLabel>
          <RadioGroup row aria-label="outline" name="outline" value={outline} onChange={handleOutlineChange}>
            <FormControlLabel value="all" control={<Radio />} label="All" />
            <FormControlLabel value="selected" control={<Radio />} label="Selected" />
            <FormControlLabel value="none" control={<Radio />} label="None" />
          </RadioGroup>
        </FormControl>
        <Typography gutterBottom>
          Opacity
        </Typography>
        <Slider
          value={opacity}
          valueLabelDisplay="auto"
          min={0}
          max={1}
          step={0.01}
          onChange={handleOpacityChange}
          // onDoubleClick={() => handleOpacityChange('', 0.3)}
        />
      </Box>
    </ControlRow>
  );
}
