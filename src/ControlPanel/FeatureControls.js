import React from 'react';
import { useSelector } from '@xstate/react';
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

const HighlightButton = ({ feature }) => {
  const highlight = useSelector(channel, state => state.context.highlight);

  const handleHighlightChange = () => {
    // feature.send({ type: 'SETHIGHLIGHT', value: !current.highlight });
  };

  return <ToggleButton
    selected={highlight}
    onChange={handleHighlightChange}
  >
    Highlight
  </ToggleButton>;
};

const ShowNoLabelButton = ({ feature }) => {
  const showNoLabel = useSelector(channel, state => state.context.showNoLabel);

  const handleShowNoLabelChange = () => {
    feature.send({ type: 'TOGGLESHOWNOLABEL' });
  };

  return <ToggleButton
    selected={!showNoLabel}
    onChange={handleShowNoLabelChange}
  >
    Hide Unlabeled Area
  </ToggleButton>;
};

const OutlineRadioButtons = ({ feature }) => {
  const outline = useSelector(channel, state => state.context.outline);

  const handleOutlineChange = (event, newValue) => {
    feature.send({ type: 'SETOUTLINE', outline: newValue });
  };

  return <FormControl component="fieldset">
    <FormLabel component="legend">Outline</FormLabel>
    <RadioGroup row aria-label="outline" name="outline" value={outline} onChange={handleOutlineChange}>
      <FormControlLabel value="all" control={<Radio />} label="All" />
      <FormControlLabel value="selected" control={<Radio />} label="Selected" />
      <FormControlLabel value="none" control={<Radio />} label="None" />
    </RadioGroup>
  </FormControl>;
};

const OpacitySlider = ({ feature }) => {
  const opacity = useSelector(channel, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) => {
    feature.send({ type: 'SETOPACITY', opacity: newValue });
  };

  return <>
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
  </>;
}




const FeatureControls = ({ feature }) => {
  return (
    <ControlRow name={"Label Display"}>
      <Box display='flex' flexDirection='column'>
        <HighlightButton feature={feature} />
        <ShowNoLabelButton feature={feature} />
        <OutlineRadioButtons feature={feature} />
        <OpacitySlider feature={feature} />
      </Box>
    </ControlRow>
  );
};

export default React.memo(FeatureControls);
