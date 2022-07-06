import { useSelector } from '@xstate/react';
import React from 'react';
import { useRaw } from '../../ProjectContext';
import GrayscaleCanvas from './GrayscaleCanvas';
import RGBCanvas from './RGBCanvas';

export const RawCanvas = ({ setBitmaps }) => {
  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);

  return isGrayscale ? (
    <GrayscaleCanvas setBitmaps={setBitmaps} />
  ) : (
    <RGBCanvas setBitmaps={setBitmaps} />
  );
};

export default RawCanvas;
