import AutoAwesomeMotionSharpIcon from '@mui/icons-material/AutoAwesomeMotionSharp';
import ForwardIcon from '@mui/icons-material/Forward';
import SquareSharpIcon from '@mui/icons-material/SquareSharp';
import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCells } from '../../ProjectContext';

function FrameModeButtons() {
  const cells = useCells();
  const frameMode = useSelector(cells, (state) => state.context.frameMode);
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Frame Mode</FormLabel>
      <ToggleButtonGroup orientation='vertical' value={frameMode}>
        <ToggleButton
          onClick={() => cells.send({ type: 'SET_FRAME_MODE', frameMode: 'one' })}
          value={'one'}
          sx={{ px: 0.5, py: 0 }}
        >
          One
          <SquareSharpIcon fontSize='small' />
        </ToggleButton>
        <ToggleButton
          onClick={() => cells.send({ type: 'SET_FRAME_MODE', frameMode: 'past' })}
          value={'past'}
          sx={{ px: 0.5, py: 0 }}
        >
          Past <ForwardIcon sx={{ transform: 'rotate(180deg)' }} />
        </ToggleButton>
        <ToggleButton
          onClick={() => cells.send({ type: 'SET_FRAME_MODE', frameMode: 'future' })}
          value={'future'}
          sx={{ px: 0.5, py: 0 }}
        >
          Future <ForwardIcon />
        </ToggleButton>
        <ToggleButton
          onClick={() => cells.send({ type: 'SET_FRAME_MODE', frameMode: 'all' })}
          value={'all'}
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
