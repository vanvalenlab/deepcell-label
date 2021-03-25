import React from 'react';
import ControlRow from './ControlRow';
import DiscreteSlider from './DiscreteSlider';
import { useImage } from '../ServiceContext';


export default function LabelControls() {
  const [current, send] = useImage();
  const { frame, feature, channel, numFrames, numFeatures, numChannels } = current.context;

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
      <DiscreteSlider label="Frame" value={frame} max={numFrames - 1} onChange={handleFrameChange}/>
      <DiscreteSlider label="Channel" value={channel} max={numChannels - 1} onChange={handleChannelChange}/>
      <DiscreteSlider label="Feature" value={feature} max={numFeatures - 1} onChange={handleFeatureChange}/>
    </ControlRow>
  )
}
