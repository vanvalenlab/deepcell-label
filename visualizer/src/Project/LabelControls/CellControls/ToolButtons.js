import { FormLabel, ToggleButton } from '@mui/material';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditCells } from '../../ProjectContext';

function ToolButtons() {
  const editCells = useEditCells();
  const tool = useSelector(editCells, (state) => state.context.tool);

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Tools</FormLabel>
      <ToggleButtonGroup orientation='vertical' value={tool}>
        <ToggleButton
          onClick={() => editCells.send({ type: 'SET_TOOL', tool: 'select' })}
          value={'select'}
          sx={{ px: 0.5, py: 0 }}
        >
          Select
        </ToggleButton>
        <ToggleButton
          onClick={() => editCells.send({ type: 'SET_TOOL', tool: 'delete' })}
          value={'delete'}
          sx={{ px: 0.5, py: 0 }}
        >
          Delete
        </ToggleButton>
        <ToggleButton
          onClick={() => editCells.send({ type: 'SET_TOOL', tool: 'replace' })}
          value={'replace'}
          sx={{ px: 0.5, py: 0 }}
        >
          Replace
        </ToggleButton>
        <ToggleButton
          onClick={() => editCells.send({ type: 'SET_TOOL', tool: 'swap' })}
          value={'swap'}
          sx={{ px: 0.5, py: 0 }}
        >
          Swap
        </ToggleButton>
        <ToggleButton
          onClick={() => editCells.send({ type: 'SET_TOOL', tool: 'new' })}
          value={'new'}
          sx={{ px: 0.5, py: 0 }}
        >
          New
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default ToolButtons;
