import { Box } from '@mui/material';
import equal from 'fast-deep-equal';
import { useSelector } from '@xstate/react';
import { useCanvas, useRaw } from '../../ProjectContext';
import ColorModeToggle from './ColorModeToggle';
import GrayscaleControls from './GrayscaleControls';
import RGBControls from './RGBControls';

export const RawControls = () => {
  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);
  const canvasMachine = useCanvas();
  const [sh, scale] = useSelector(
      canvasMachine,
      (state) => [state.context.height, state.context.scale],
      equal
  );
  const menuHeight = scale * sh - 250;

  const overflowStyle = {
    overflow: 'hidden',
    overflowY: 'auto',
    height: menuHeight,
    '&::-webkit-scrollbar': {
      width: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.1)'
    },
    '&::-webkit-scrollbar-thumb': {
        borderRadius: 10,
        backgroundColor: 'rgba(100,100,100,0.5)',
    },
  };

  return (
    <Box sx={isGrayscale ? {} : overflowStyle} display='flex' flexDirection='column' alignItems='flex-start'>
      <div style={{marginBottom: 10}}><ColorModeToggle /></div>
      {isGrayscale ? <GrayscaleControls /> : <RGBControls />}
    </Box>
  );
};

export default RawControls;
