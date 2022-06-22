import AutoAwesomeMotionSharpIcon from '@mui/icons-material/AutoAwesomeMotionSharp';
import ForwardIcon from '@mui/icons-material/Forward';
import SquareSharpIcon from '@mui/icons-material/SquareSharp';
import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useCellsMachine } from '../../ProjectContext';

function ModeButtons() {
  const cellsMachine = useCellsMachine();
  const mode = useSelector(cellsMachine, (state) => state.context.mode);
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Mode</FormLabel>
      <ToggleButtonGroup orientation='vertical' value={mode}>
        <ToggleButton
          onClick={() => cellsMachine.send({ type: 'SET_MODE', mode: 'one' })}
          value={'one'}
          sx={{ px: 0.5, py: 0 }}
        >
          One
          <SquareSharpIcon fontSize='small' />
        </ToggleButton>
        <ToggleButton
          onClick={() => cellsMachine.send({ type: 'SET_MODE', mode: 'past' })}
          value={'past'}
          sx={{ px: 0.5, py: 0 }}
        >
          Past <ForwardIcon sx={{ transform: 'rotate(180deg)' }} />
        </ToggleButton>
        <ToggleButton
          onClick={() => cellsMachine.send({ type: 'SET_MODE', mode: 'future' })}
          value={'future'}
          sx={{ px: 0.5, py: 0 }}
        >
          Future <ForwardIcon />
        </ToggleButton>
        <ToggleButton
          onClick={() => cellsMachine.send({ type: 'SET_MODE', mode: 'all' })}
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

export default ModeButtons;
