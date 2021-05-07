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
import { useImage } from '../ServiceContext';

export const HighlightButton = () => {
  const image = useImage();
  const highlight = useSelector(image, state => state.context.highlight);

  const handleHighlightChange = () => {
    image.send({ type: 'TOGGLEHIGHLIGHT' });
  };

  return <ToggleButton
    selected={highlight}
    onChange={handleHighlightChange}
  >
    Highlight
  </ToggleButton>;
};

export const ShowNoLabelButton = ({ feature }) => {
  const image = useImage();
  const showNoLabel = useSelector(image, state => state.context.showNoLabel);

  const handleShowNoLabelChange = () => {
    image.send({ type: 'TOGGLESHOWNOLABEL' });
  };

  return <ToggleButton
    selected={!showNoLabel}
    onChange={handleShowNoLabelChange}
  >
    Hide Unlabeled Area
  </ToggleButton>;
};

export const OutlineRadioButtons = () => {
  const image = useImage();
  const outline = useSelector(image, state => state.context.outline);

  const handleOutlineChange = (event, newValue) => {
    image.send({ type: 'SETOUTLINE', outline: newValue });
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

export const OpacitySlider = () => {
  const image = useImage();
  const opacity = useSelector(image, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) => {
    image.send({ type: 'SETOPACITY', opacity: newValue });
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




const FeatureControls = () => {
  return <ControlRow name={"Label Display"}>
    <Box display='flex' flexDirection='column'>
      <HighlightButton />
      <ShowNoLabelButton />
      <OutlineRadioButtons />
      <OpacitySlider />
    </Box>
  </ControlRow>;
};

export default React.memo(FeatureControls);
