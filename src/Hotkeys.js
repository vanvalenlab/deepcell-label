import React from 'react';
import {
  useCanvasHotkeys,
  useUndoHotkeys,
  useImageHotkeys,
  useToolHotkeys,
  useSelectHotkeys
} from './use-hotkeys';
import { useImage } from './ServiceContext';
import { useSelector } from '@xstate/react';

// these hotkeys require a feature actor
// only "render" them once the actor exists
const SelectHotkeys = ({ feature }) => {
  useSelectHotkeys(feature);
  return null;
};

const Hotkeys = () => {
  useCanvasHotkeys();
  useUndoHotkeys();
  useImageHotkeys();
  useToolHotkeys();

  const image = useImage();
  const feature = useSelector(image, state => state.context.feature);
  const features = useSelector(image, state => state.context.features);
  const featureActor = features[feature];
  console.log(featureActor);
  if (!featureActor) {
    return null;
  }

  return <SelectHotkeys feature={featureActor} />;
}

export default Hotkeys;