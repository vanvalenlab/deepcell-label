import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import { useSelector } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import FormLabel from '@material-ui/core/FormLabel';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';

import ControlRow from './ControlRow';
import { useImage } from '../ServiceContext';


export const ChannelSlider = ({ channel }) => {
  const channelIndex = useSelector(channel, state => state.context.channel);
  const range = useSelector(channel, state => state.context.range);
  const color = useSelector(channel, state => state.context.color);

  const handleChange = (event, newValue) => {
    channel.send({ type: 'SETRANGE', range: newValue });
  };

  return <>
    <Typography>Channel {channelIndex}</Typography>
    <Slider
      min={0}
      max={255}
      value={range}
      onChange={handleChange}
      valueLabelDisplay="off"
      style={{ color }}
      />
  </>;
}

export const ChannelSliders = () => {
  const image = useImage();
  const channels = useSelector(image, state => state.context.channels);

  return <>
    <Box display='flex' flexDirection='row' justifyContent='space-between'>
      <FormLabel component="legend">
        Adjust Channels
      </FormLabel>
      <Tooltip title={<div>
        Decrease the max value on the right to make the channel lighter.
        <br />
        Increase the min value on the left to make the channel darker.
        </div>}
      >
        <HelpOutlineIcon color="action" />
      </Tooltip>
    </Box>  
    {Object.entries(channels).map(
      ([index, channel]) => <ChannelSlider key={index} channel={channel} />
    )}
  </>;
}

const RGBControls = () => {

  return <ControlRow name={"RGB"}>
    <ChannelSliders />
  </ControlRow>;
}

export default RGBControls;
