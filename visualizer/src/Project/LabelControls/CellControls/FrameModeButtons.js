import AutoAwesomeMotionSharpIcon from '@mui/icons-material/AutoAwesomeMotionSharp';
import ForwardIcon from '@mui/icons-material/Forward';
import SquareSharpIcon from '@mui/icons-material/SquareSharp';
import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useOverlaps } from '../../ProjectContext';

function FrameModeButtons() {
  const overlaps = useOverlaps();
  const frameMode = useSelector(overlaps, (state) => state.context.frameMode);
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Frame Mode</FormLabel>
      <ToggleButtonGroup orientation='vertical'>
        <ToggleButton
          onClick={() => overlaps.send({ type: 'SET_FRAME_MODE', frameMode: 'one' })}
          selected={frameMode === 'one'}
          sx={{ px: 0.5, py: 0 }}
        >
          One
          <SquareSharpIcon fontSize='small' />
        </ToggleButton>
        <ToggleButton
          onClick={() => overlaps.send({ type: 'SET_FRAME_MODE', frameMode: 'past' })}
          selected={frameMode === 'past'}
          sx={{ px: 0.5, py: 0 }}
        >
          Past <ForwardIcon sx={{ transform: 'rotate(180deg)' }} />
        </ToggleButton>
        <ToggleButton
          onClick={() => overlaps.send({ type: 'SET_FRAME_MODE', frameMode: 'future' })}
          selected={frameMode === 'future'}
          sx={{ px: 0.5, py: 0 }}
        >
          Future <ForwardIcon />
        </ToggleButton>
        <ToggleButton
          onClick={() => overlaps.send({ type: 'SET_FRAME_MODE', frameMode: 'all' })}
          selected={frameMode === 'all'}
          sx={{ px: 0.5, py: 0 }}
        >
          All
          <AutoAwesomeMotionSharpIcon />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default FrameModeButtons;
