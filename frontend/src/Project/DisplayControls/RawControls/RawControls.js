import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useRaw } from '../../ProjectContext';
import ColorModeToggle from './ColorModeToggle';
import GrayscaleControls from './GrayscaleControls';
import RGBControls from './RGBControls';

export const RawControls = () => {
  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);

  return (
    <Box display='flex' flexDirection='column' alignItems='flex-start'>
      <div style={{marginBottom: 10}}><ColorModeToggle /></div>
      {isGrayscale ? <GrayscaleControls /> : <RGBControls />}
    </Box>
  );
};

export default RawControls;
