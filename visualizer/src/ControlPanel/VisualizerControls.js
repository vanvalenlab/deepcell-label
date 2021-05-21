import React from 'react';
import { useSelector } from '@xstate/react';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TableContainer from '@material-ui/core/TableContainer';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';

import { MultiChannelController } from './RawController';
import { OutlineRadioButtons } from './LabeledController';
import { useRaw, useLabeled } from '../ServiceContext';


export const ColorModeRadioButtons = () => {

  const colorMode = 'multichannel';
  const handleColorModeChange = () => { };
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Segmentation</FormLabel>
      <RadioGroup row aria-label="colorMode" name="colorMode" value={colorMode} onChange={handleColorModeChange}>
        <FormControlLabel value='multichannel' control={<Radio />} label="Multi-channel" />
        <FormControlLabel value='one channel' control={<Radio />} label="Single channel" />
        <FormControlLabel value='labels only' control={<Radio />} label="Labels only" />
      </RadioGroup>
    </FormControl>
  );
}

export const FeatureRadioButtons = () => {
  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);
  const numFeatures = useSelector(labeled, state => state.context.numFeatures);

  const handleFeatureChange = (event, newValue) => {
    labeled.send({ type: 'LOADFEATURE', feature: Number(newValue) });
  };

  return numFeatures > 1 &&
    <FormControl component="fieldset">
    <FormLabel component="legend">Segmentation</FormLabel>
    <RadioGroup row aria-label="segmentation" name="segmentation" value={feature} onChange={handleFeatureChange}>
      <FormControlLabel value={0} control={<Radio />} label="Whole Cell" />
      <FormControlLabel value={1} control={<Radio />} label="Nuclear" />
    </RadioGroup>
  </FormControl>;
};

const VisualizerControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  return (
    <TableContainer id='control-panel' style={{overflow: 'hidden'}}>
      <TableRow >
        <TableCell>
          {raw && <MultiChannelController />}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            {labeled && <FeatureRadioButtons />}
            <Tooltip title="Press F to toggle the segmentation.">
              <HelpOutlineIcon color="action" fontSize="large" />
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            {labeled && <OutlineRadioButtons />}
            <Tooltip title="Press I to toggle the outline color as black or white.">
              <HelpOutlineIcon color="action" fontSize="large" />
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    </TableContainer>
  );
};

export default VisualizerControls;