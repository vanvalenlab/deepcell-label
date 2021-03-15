import React, { useState, useEffect, useContext } from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';

import { useService } from '@xstate/react';
import ControlRow from './ControlRow';

import { FrameContext } from '../ServiceContext';

function SliceSlider(props) {
  const { label, value, max, onChange } = props;
  const [display, setDisplay] = useState("on");

  // Display label for a second after the label changes
  useEffect(() => {
    setDisplay("on");
    const displayTimeout = setTimeout(() => setDisplay("auto"), 1000);
    return () => clearTimeout(displayTimeout);
  }, [value]);

  return <>
    <Typography gutterBottom>
      {label}
    </Typography>
    <Slider
      value={value}
      valueLabelDisplay={display}
      step={1}
      marks
      min={0}
      max={max}
      onChange={onChange}
    />
    
    
  </>;
}

export default function LabelControls() {
  
  const service = useContext(FrameContext);
  const [current, send] = useService(service);
  const { frame, feature, channel } = current.context;
  const { numFrames, numFeatures, numChannels } = current.context;

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
      <SliceSlider label="Frame" value={frame} max={numFrames - 1} onChange={handleFrameChange}/>
      <SliceSlider label="Channel" value={channel} max={numChannels - 1} onChange={handleChannelChange}/>
      <SliceSlider label="Feature" value={feature} max={numFeatures - 1} onChange={handleFeatureChange}/>
    </ControlRow>
  )
}