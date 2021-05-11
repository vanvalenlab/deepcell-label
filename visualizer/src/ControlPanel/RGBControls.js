import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import { withStyles } from '@material-ui/core/styles';
import { red, green, blue } from '@material-ui/core/colors';
import { useSelector } from '@xstate/react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import ControlRow from './ControlRow';
import { useChannel, useImage } from '../ServiceContext';
import { useSelectHotkeys } from '../use-hotkeys';

const RedRadio = withStyles({
  root: {
    color: '#ff0000',
    '&$checked': {
      color: '#ff0000',
    },
  },
  checked: {},
})((props) => <Radio color="default" {...props} />);

const GreenRadio = withStyles({
  root: {
    color: '#00ff00',
    '&$checked': {
      color: '#00ff00',
    },
  },
  checked: {},
})((props) => <Radio color="default" {...props} />);

const BlueRadio = withStyles({
  root: {
    color: '#0000ff',
    '&$checked': {
      color: '#0000ff',
    },
  },
  checked: {},
})((props) => <Radio color="default" {...props} />);

const ColorRadio = ({ channel }) => {
  // const image = useImage();
  // const channelColor = useSelector(channel, state => state.context.color);
  const [channelColor, setChannelColor] = React.useState('red');

  const handleChange = (event) => {
    setChannelColor(event.target.value);
  };

  return <>
    <RedRadio
      checked={channelColor === 'red'}
      onChange={handleChange}
      value={'red'}
      name="radio-button-demo"
      inputProps={{ 'aria-label': 'red' }}
    />
    <GreenRadio
      checked={channelColor === 'green'}
      onChange={handleChange}
      value={'green'}
      name="radio-button-demo"
      inputProps={{ 'aria-label': 'green' }}
    />
    <BlueRadio
      checked={channelColor === 'blue'}
      onChange={handleChange}
      value={'blue'}
      name="radio-button-demo"
      inputProps={{ 'aria-label': 'blue' }}
    />
  </>;
}

const ChannelColorRow = ({ channel }) => {
  console.log(channel);
  const channelIndex = useSelector(channel, state => state.context.channel);
  console.log(channelIndex);

  return <TableRow>
    <TableCell component="th" scope="row">Channel { channelIndex }</TableCell>
    <TableCell align="right"><ColorRadio channel={channel}/></TableCell>
  </TableRow>;
}

const ChannelSlider = ({ channel, color }) => {
  const channelIndex = useSelector(channel, state => state.context.channel);
  const range = useSelector(channel, state => state.context.range);
  console.log(range);
  // const [value, setValue] = React.useState([0, 127]);

  const handleChange = (event, newValue) => {
    channel.send({ type: 'SETRANGE', range: newValue });
  };

  return <TableRow>
    <TableCell component="th" scope="row">Channel { channelIndex }</TableCell>
    <TableCell width='130px' align="right">
      <Slider
        min={0}
        max={255}
        value={range}
        onChange={handleChange}
        valueLabelDisplay="off"
        style={{ color }}
      />
    </TableCell>
  </TableRow>;
}

const RGBControls = () => {
  const image = useImage();
  const channels = useSelector(image, state => state.context.channels);
  const colors = useSelector(image, state => state.context.channelColors);

  return <ControlRow name={"RGB"}>
    <TableContainer size="small">
      <Table >
        <TableBody>
          {/* {Object.values(channels).map((channel) => <ChannelColorRow channel={channel} />)} */}
          {Object.entries(colors).map(([index, color]) => <ChannelSlider channel={channels[index]} color={color} />)}
        </TableBody>
      </Table>
    </TableContainer>
  </ControlRow>;
}

export default RGBControls;