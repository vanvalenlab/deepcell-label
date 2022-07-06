import { Box, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditDivisions } from '../../ProjectContext';

function EditingPrompt() {
  const editDivisions = useEditDivisions();
  const addingDaughter = useSelector(editDivisions, (state) => state.matches('addingDaughter'));
  const parent = useSelector(editDivisions, (state) => state.context.selected);
  const daughter = useSelector(editDivisions, (state) => state.context.daughter);

  if (!addingDaughter) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: '142px' }}>
      {daughter ? (
        <Typography>
          Click again to add daughter {daughter} to cell {parent}.
        </Typography>
      ) : (
        <Typography>Click a cell to select the daughter.</Typography>
      )}
    </Box>
  );
}

export default EditingPrompt;
