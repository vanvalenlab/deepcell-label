import React from 'react';
import { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Box from '@material-ui/core/Box';


import Predict from './Predict';
import { useService } from '@xstate/react';
import { labelService } from '../statechart/service';

import ControlRow from './ControlRow';
import RawControls from './RawControls';
import LabelControls from './LabelControls';


const useRowStyles = makeStyles({
  root: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
  slider: {
    width: 300,
  },
});


function SliceSlider(props) {
  const { value, max, handler } = props;

  return (
    <>
      <Slider
        value={value}
        valueLabelDisplay="auto"
        step={1}
        marks
        min={0}
        max={max}
        onChange={handler}
      />
    </>
  )
}


function SliceRow() {
  const classes = useRowStyles();
  const [current, send] = useService(labelService);

  const handleFrameChange = (event, newValue) => {
    // send({ type: 'SETFRAME', value: newValue });
  };

  const handleChannelChange = (event, newValue) => {
    // send({ type: 'SETFRAME', value: newValue });
  };

  const handleFeatureChange = (event, newValue) => {
    // send({ type: 'SETFRAME', value: newValue });
  };

  return (
    <ControlRow name={"Slice"}>
      <Typography id="discrete-slider" gutterBottom>
        Frame
      </Typography>
      <SliceSlider value={current.frame} max={current.numFrames - 1 || 25} handler={handleFrameChange}/>
      <Typography gutterBottom>
        Channel
      </Typography>
      <SliceSlider value={current.channel} max={current.numChannels - 1 || 2} handler={handleChannelChange}/>
      <Typography gutterBottom>
        Feature
      </Typography>
      <SliceSlider value={current.feature} max={current.numFeatures - 1 || 1} handler={handleFeatureChange}/>
    </ControlRow>
  )
}

export default function ControlPanel() {
  const [selectedJobType, setSelectedJobType] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState('');

  const showErrorMessage = (errText) => {
    setErrorText(errText);
    setShowError(true);
  };

  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <SliceRow />
          <LabelControls />
          <RawControls />
          <ControlRow name={"Label"} />
          <ControlRow name={"Tool"} />
          <ControlRow name={"Predict"}>
            <Predict />
          </ControlRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
