import React from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import { useSelector } from '@xstate/react';

import ControlRow from './ControlRow';
import { useImage } from '../ServiceContext';


export const ChannelSlider = ({ channel, color }) => {
  const channelIndex = useSelector(channel, state => state.context.channel);
  const range = useSelector(channel, state => state.context.range);

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
  const colors = useSelector(image, state => state.context.channelColors);

  return <>
    {Object.entries(colors).map(
      ([index, color]) => <ChannelSlider channel={channels[index]} color={color} />
    )}
  </>;
}

const RGBControls = () => {

  return <ControlRow name={"RGB"}>
    <ChannelSliders />
  </ControlRow>;
}

export default RGBControls;
