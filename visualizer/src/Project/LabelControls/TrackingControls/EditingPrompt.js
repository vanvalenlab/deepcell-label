import { Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditLineage } from '../../ProjectContext';

function EditingPrompt() {
  const editLineage = useEditLineage();
  const addingDaughter = useSelector(editLineage, (state) => state.matches('addingDaughter'));
  const parent = useSelector(editLineage, (state) => state.context.parent);

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
