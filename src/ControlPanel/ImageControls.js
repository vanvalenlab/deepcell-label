import React from 'react';
import { useActor } from '@xstate/react';
import ControlRow from './ControlRow';
import DiscreteSlider from './DiscreteSlider';
import { useImage } from '../ServiceContext';



export default function ImageControls() {
  const image = useImage();
  const [current, send] = useActor(image);
  const { frame, feature, channel, numFrames, numFeatures, numChannels } = current.context;


  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      send({ type: 'LOADFRAME', frame: newValue });
    }
  };

  const handleChannelChange = (event, newValue) => {
    send({ type: 'LOADCHANNEL', channel: newValue });
  };

  const handleFeatureChange = (event, newValue) => {
    send({ type: 'LOADFEATURE', feature: newValue });
  };

  return (
    <ControlRow name={"Image"}>
      { numFrames > 1 &&
        <DiscreteSlider label="Frame" value={frame} max={numFrames - 1} onChange={handleFrameChange} />      
      }
      { numChannels > 1 &&
        <DiscreteSlider label="Channel" value={channel} max={numChannels - 1} onChange={handleChannelChange}/>
      }
      { numFeatures > 1 &&
        <DiscreteSlider label="Feature" value={feature} max={numFeatures - 1} onChange={handleFeatureChange} />
      }
    </ControlRow>
  )
}
