import React, { useContext } from 'react';
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

import { useService } from '@xstate/react';
import ControlRow from './ControlRow';

import { FrameContext } from '../ServiceContext';

function SliceSlider(props) {
  const { value, max, onChange } = props;

  return (
    <>
      <Slider
        value={value}
        valueLabelDisplay="auto"
        step={1}
        marks
        min={0}
        max={max}
        onChange={onChange}
      />
    </>
  )
}

export default function LabelControls() {
  
  const service = useContext(FrameContext);
  const [current, send] = useService(service);
  const { frame, feature, channel } = current.context;

  const handleFrameChange = (event, newValue) => {
    send({ type: 'SETFRAME', frame: newValue });
  };

  const handleChannelChange = (event, newValue) => {
    send({ type: 'SETCHANNEL', channel: newValue });
  };

  const handleFeatureChange = (event, newValue) => {
    send({ type: 'SETFEATURE', feature: newValue });
  };

  return (
    <ControlRow name={"Slice"}>
      <Typography id="discrete-slider" gutterBottom>
        Frame
      </Typography>
      <SliceSlider value={frame} max={current.numFrames - 1 || 23} onChange={handleFrameChange}/>
      <Typography gutterBottom>
        Channel
      </Typography>
      <SliceSlider value={channel} max={current.numChannels - 1 || 1} onChange={handleChannelChange}/>
      <Typography gutterBottom>
        Feature
      </Typography>
      <SliceSlider value={feature} max={current.numFeatures - 1 || 2} onChange={handleFeatureChange}/>
    </ControlRow>
  )
}