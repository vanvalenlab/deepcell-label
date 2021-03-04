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
import { rawAdjustService } from '../statechart/service';
import ControlRow from './ControlRow';

export default function RawDisplayRow() {
  const [current, send] = useService(rawAdjustService);

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
        // defaultValue={current.brightness}
        valueLabelDisplay="auto"
        min={-1}
        max={1}
        step={0.01}
        onChange={handleBrightnessChange}
      />
      <Typography gutterBottom>
        Contrast
      </Typography>
      <Slider
        value={contrast}
        // defaultValue={current.contrast}
        valueLabelDisplay="auto"
        min={-1}
        max={1}
        step={0.01}
        onChange={handleContrastChange}
      />
    </ControlRow>
  );


}