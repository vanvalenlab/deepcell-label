import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useEditCells } from '../../ProjectContext';

function ToolButtons() {
  const editCells = useEditCells();
  const tool = useSelector(editCells, (state) => state.context.tool);

  useEffect(() => {
    bind('esc', () => editCells.send('EXIT'));
  }, [editCells]);

  const onClick = useCallback(
    (event, value) => {
      editCells.send({ type: 'SET_TOOL', tool: value });
    },
    [editCells]
  );

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Tools</FormLabel>
      <ToggleButtonGroup orientation='vertical' value={tool} onClick={onClick}>
        <ToggleButton value={'select'} sx={{ px: 0.5, py: 0 }}>
          Select
        </ToggleButton>
        <ToggleButton value={'delete'} sx={{ px: 0.5, py: 0 }}>
          Delete
        </ToggleButton>
        <ToggleButton value={'replace'} sx={{ px: 0.5, py: 0 }}>
          Replace
        </ToggleButton>
        <ToggleButton value={'swap'} sx={{ px: 0.5, py: 0 }}>
          Swap
        </ToggleButton>
        <ToggleButton value={'new'} sx={{ px: 0.5, py: 0 }}>
          New
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default ToolButtons;
