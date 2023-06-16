import { Box, FormLabel, Tooltip } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useCellTypes, useEditCellTypes } from '../../../ProjectContext';

function ToggleAll() {
  const editCellTypes = useEditCellTypes();
  const cellTypes = useCellTypes();
  const toggleArray = useSelector(cellTypes, (state) => state.context.isOn);

  const handleCheck = useCallback(() => {
    if (toggleArray.every((e, i) => e === true || e === null || i === 0)) {
      editCellTypes.send({ type: 'UNTOGGLE_ALL' });
    } else {
      editCellTypes.send({ type: 'TOGGLE_ALL' });
    }
  }, [editCellTypes, toggleArray]);

  useEffect(() => {
    bind('t', handleCheck);
    return () => {
      unbind('t', handleCheck);
    };
  }, [handleCheck]);

  return (
    <Tooltip title={<kbd>T</kbd>} placement='right'>
      <Box display='flex' alignItems='center'>
        <Checkbox
          checked={toggleArray.every((e, i) => e === true || e === null || i === 0)}
          onChange={handleCheck}
        />
        <FormLabel sx={{ marginLeft: 0.75 }}>Toggle All</FormLabel>
      </Box>
    </Tooltip>
  );
}

export default ToggleAll;
