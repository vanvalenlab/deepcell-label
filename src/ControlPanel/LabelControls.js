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

import { useService } from '@xstate/react';
import { labelAdjustService } from '../statechart/service';
import ControlRow from './ControlRow';



export default function LabelControls() {
  const [current, send] = useService(labelAdjustService);
  const { opacity } = current.context;

  const handleHighlightChange = () => {
    // send({ type: 'SETHIGHLIGHT', value: !current.highlight });
  };

  const handleOutlineChange = (event, newValue) => {
    // send({ type: 'SETOUTLINE', value: newValue });
  };

  const handleOpacityChange = (event, newValue) => {
    send({ type: 'SETOPACITY', opacity: newValue });
  };

  return (
    <ControlRow name={"Label Display"}>
      <Box display='flex' flexDirection='column'>
        <ToggleButton
          value="check"
          selected={current.highlight}
          onChange={handleHighlightChange}
        >
          Highlight
        </ToggleButton>
        <FormControl component="fieldset">
          <FormLabel component="legend">Outline</FormLabel>
          <RadioGroup row aria-label="outline" name="outline" value={current.outline || "selected"} onChange={handleOutlineChange}>
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
        />
      </Box>
    </ControlRow>
  );
}