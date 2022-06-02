import { Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditDivisions } from '../../ProjectContext';

function EditingPrompt() {
  const editDivisions = useEditDivisions();
  const addingDaughter = useSelector(editDivisions, (state) => state.matches('addingDaughter'));
  const parent = useSelector(editDivisions, (state) => state.context.parent);

  if (!addingDaughter) {
    return null;
  }

  return (
    <Typography sx={{ maxWidth: '100%' }}>
      Click a label to add a daughter to label {parent}.
    </Typography>
  );
}

export default EditingPrompt;
