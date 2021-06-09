import React from 'react';
import { useSelector } from '@xstate/react';
import Select from '@material-ui/core/Select';
import Tooltip from '@material-ui/core/Tooltip';
import FormLabel from '@material-ui/core/FormLabel';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';

import { useLabeled } from '../ServiceContext';


export const FeatureSelect = () => {
  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);
  const numFeatures = useSelector(labeled, state => state.context.numFeatures);
  const featureNames = useSelector(labeled, state => state.context.featureNames);

  const handleFeatureChange = (event) => {
    labeled.send({ type: 'LOADFEATURE', feature: Number(event.target.value) });
  };

  return numFeatures > 1 &&
    <Grid style={{ width: '100%' }} item>
      <Tooltip title={<span>Cycle with <kbd>F</kbd> or <kbd>Shift</kbd> + <kbd>F</kbd>.</span>}>
        <Select
          native
          value={feature}
          onChange={handleFeatureChange}
        >
          {featureNames.map((name, index) => (
            <option key={index} value={index}>
              {name}
            </option>
          ))}
        </Select>
      </Tooltip>
    </Grid>;
};


export const OpacitySlider = () => {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) => {
    labeled.send({ type: 'SETOPACITY', opacity: newValue });
  };
  const handleDoubleClick = (event) => {
    const newOpacity = opacity === 0 ? 1 : opacity === 1 ? 0.3 : 0;
    labeled.send({ type: 'SETOPACITY', opacity: newOpacity });
  }

  return <Grid style={{ width: '100%' }} item>
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
      onDoubleClick={handleDoubleClick}
    />
  </Grid>;
}

export const OutlineRadioButtons = () => {
  const labeled = useLabeled();
  const outline = useSelector(labeled, state => state.context.outline);

  const handleOutlineChange = (event, newValue) => {
    labeled.send({ type: 'SETOUTLINE', outline: newValue });
  };

  return <Grid style={{ width: '100%' }} item>
    <FormControl component="fieldset">
      <FormLabel component="legend">Outline</FormLabel>
      <RadioGroup row aria-label="outline" name="outline" value={outline} onChange={handleOutlineChange}>
        <Tooltip title='Show border around all cells'>
          <FormControlLabel value="all" control={<Radio />} label="All" />
        </Tooltip>
        <Tooltip title={<div>Show border around one cell. <br /> Click on a cell to outline it.</div>}>
          <FormControlLabel value="selected" control={<Radio />} label="Selected" />
        </Tooltip>
        <Tooltip title='Hide borders.'>
          <FormControlLabel value="none" control={<Radio />} label="None" />
        </Tooltip>
      </RadioGroup>
    </FormControl>
    {/* <Tooltip title="Press I to toggle the outline color as black or white.">
        <HelpOutlineIcon color="action" fontSize="large" />
    </Tooltip> */}
  </Grid>;
};

const LabeledController = () => {
  const labeled = useLabeled();
  return <>
    <Box display='flex' flexDirection='row' justifyContent='space-between'>
      <FormLabel component="legend">
        Segmentation Controls
      </FormLabel>
    </Box>
    {labeled && <>
      <FeatureSelect />
      <OpacitySlider />
      <OutlineRadioButtons />
    </>}
  </>;
}

export default LabeledController;
