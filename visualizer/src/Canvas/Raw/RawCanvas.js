import { useSelector } from '@xstate/react';
import React from 'react';
import { useImage } from '../../ServiceContext';
import GrayscaleCanvas from './GrayscaleCanvas';
import RGBCanvas from './RGBCanvas';

export const RawCanvas = props => {
  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  return grayscale ? <GrayscaleCanvas {...props} /> : <RGBCanvas {...props} />;
};

export default RawCanvas;
