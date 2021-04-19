import React from 'react';
import { useSelector } from '@xstate/react';
import ControlRow from './ControlRow';
import DiscreteSlider from './DiscreteSlider';
import { useImage } from '../ServiceContext';


const FrameSlider = () => {
  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);
  const numFrames = useSelector(image, state => state.context.numFrames);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOADFRAME', frame: newValue });
    }
  };

  return numFrames > 1 &&
    <DiscreteSlider
      label="Frame"
      value={frame}
      max={numFrames - 1}
      onChange={handleFrameChange}
    />;
};

const ChannelSlider = () => {
  const image = useImage();
  const channel = useSelector(image, state => state.context.channel);
  const numChannels = useSelector(image, state => state.context.numChannels);

  const handleChannelChange = (event, newValue) => {
    image.send({ type: 'LOADCHANNEL', channel: newValue });
  };

  return numChannels > 1 &&
    <DiscreteSlider
      label="Channel"
      value={channel}
      max={numChannels - 1}
      onChange={handleChannelChange}
    />;
};

const FeatureSlider = () => {
  const image = useImage();
  const feature = useSelector(image, state => state.context.feature);
  const numFeatures = useSelector(image, state => state.context.numFeatures);

  const handleFeatureChange = (event, newValue) => {
    image.send({ type: 'LOADFEATURE', feature: newValue });
  };

  return numFeatures > 1 &&
    <DiscreteSlider
      label="Feature"
      value={feature}
      max={numFeatures - 1}
      onChange={handleFeatureChange}
    />;
};

const ImageControls = () => {
  return (
    <ControlRow name={"Image"}>
      <FrameSlider />
      <ChannelSlider />
      <FeatureSlider />
    </ControlRow>
  )
};

export default React.memo(ImageControls);
