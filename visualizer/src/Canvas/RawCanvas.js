import React from 'react';
import { useActor } from '@xstate/react';
import { useImage } from '../ServiceContext';
import GrayscaleCanvas from './GrayscaleCanvas';
import RGBCanvas from './RGBCanvas';

export const RawCanvas = (props) => {
  const image = useImage();
  const [current] = useActor(image);

  return <>
    {current.matches('color.color') && <RGBCanvas {...props} />}
    {current.matches('color.grayscale') && <GrayscaleCanvas {...props} />}
  </>;
};

export default RawCanvas;
