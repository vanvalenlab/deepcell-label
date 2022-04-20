import { Box } from '@mui/material';
import FormLabel from '@mui/material/FormLabel';
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
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <FormLabel component='legend'>Channels</FormLabel>
        <ColorModeToggle />
      </Box>
      {isGrayscale ? <GrayscaleControls /> : <RGBControls />}
    </>
  );
};

export default RawControls;
