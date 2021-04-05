import React from 'react';
import ControlRow from './ControlRow';
import DiscreteSlider from './DiscreteSlider';
import { useImage } from '../ServiceContext';


export default function ImageControls() {
  const [current, send] = useImage();
  const { frame, feature, channel, numFrames, numFeatures, numChannels } = current.context;

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      send({ type: 'SETFRAME', frame: newValue });
    }
  };

  const handleChannelChange = (event, newValue) => {
    send({ type: 'SETCHANNEL', channel: newValue });
  };

  const handleFeatureChange = (event, newValue) => {
    send({ type: 'SETFEATURE', feature: newValue });
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
