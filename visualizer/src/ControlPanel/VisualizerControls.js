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

import { ChannelSliders } from './RGBControls';
import { OutlineRadioButtons } from './FeatureControls';
import { useImage } from '../ServiceContext';


export const FeatureRadioButtons = () => {
  const image = useImage();
  const feature = useSelector(image, state => state.context.feature);
  const numFeatures = useSelector(image, state => state.context.numFeatures);

  const handleFeatureChange = (event, newValue) => {
    image.send({ type: 'LOADFEATURE', feature: Number(newValue) });
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

  return (
    <TableContainer id='control-panel' style={{overflow: 'hidden'}}>
      <TableRow >
        <TableCell>
          <ChannelSliders />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <FeatureRadioButtons />
            <Tooltip title="Press F to toggle the segmentation.">
              <HelpOutlineIcon color="action" />
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <OutlineRadioButtons />
            <Tooltip title="Press I to toggle the outline color as black or white.">
              <HelpOutlineIcon color="action" />
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    </TableContainer>
  );
};

export default VisualizerControls;