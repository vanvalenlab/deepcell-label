import React, { useContext } from 'react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';

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
      <Typography id="discrete-slider" gutterBottom>
        Frame
      </Typography>
      <SliceSlider value={frame} max={numFrames - 1} onChange={handleFrameChange}/>
      <Typography gutterBottom>
        Channel
      </Typography>
      <SliceSlider value={channel} max={numChannels - 1} onChange={handleChannelChange}/>
      <Typography gutterBottom>
        Feature
      </Typography>
      <SliceSlider value={feature} max={numFeatures - 1} onChange={handleFeatureChange}/>
    </ControlRow>
  )
}