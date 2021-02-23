import React from 'react';
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



import { useService } from '@xstate/react';
import { labelService } from './service';

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


function ControlRow(props) {
  const { name, header, children } = props;
  const [open, setOpen] = React.useState(false);
  const classes = useRowStyles();

  const [current, send] = useService(labelService);

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {name}
        </TableCell>
        <TableCell component="th" scope="row">
          {header}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {children}
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

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
    <ControlRow name={"Slice"} header={"Frame: 0"}>
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

function RawDisplayRow() {
  const [current, send] = useService(labelService);

  const handleBrightnessChange = (event, newValue) => {
    // send({ type: 'SETCONTRAST', value: newValue });
  };

  const handleContrastChange = (event, newValue) => {
    // send({ type: 'SETCONTRAST', value: newValue });
  };

  const handleInvertChange = (event, newValue) => {
    // send({ type: 'SETINVERT', value: newValue });
  };

  return (
    <ControlRow name={"Raw Display"} header={"brightness: 0"}>
      <Typography gutterBottom>
        Brightness
      </Typography>
      <Slider
        value={current.brightness}
        valueLabelDisplay="auto"
        min={0}
        max={1}
        onChange={handleBrightnessChange}
      />
      <Typography gutterBottom>
        Contrast
      </Typography>
      <Slider
        value={current.contrast}
        valueLabelDisplay="auto"
        min={0}
        max={1}
        onChange={handleContrastChange}
      />
      <ToggleButton
        value="check"
        selected={current.invert}
        onChange={handleInvertChange}
      >
        <CheckIcon />
      </ToggleButton>
    </ControlRow>
  );


}

function LabelDisplayRow() {
  const [current, send] = useService(labelService);

  const handleHighlightChange = () => {
    // send({ type: 'SETHIGHLIGHT', value: !current.highlight });
  };

  const handleOutlineChange = (event, newValue) => {
    // send({ type: 'SETOUTLINE', value: newValue });
  };

  const handleOpacityChange = (event, newValue) => {
    // send({ type: 'SETOPACITY', value: newValue });
  };

  return (
    <ControlRow name={"Label Display"} header={"highlight: on"}>
      <ToggleButton
        value="check"
        selected={current.highlight}
        onChange={handleHighlightChange}
      >
        <CheckIcon />
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
        value={current.opacity}
        valueLabelDisplay="auto"
        min={0}
        max={1}
        onChange={handleOpacityChange}
      />
    </ControlRow>
  );
}

export default function ControlPanel() {

  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <SliceRow />
          <LabelDisplayRow />
          <RawDisplayRow />
          <ControlRow name={"Label"} header={"label: 1"}/>
          <ControlRow name={"Tool"} header={"brush"}/>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
