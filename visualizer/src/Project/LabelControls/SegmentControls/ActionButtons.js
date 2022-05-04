import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import React from 'react';
import AutofitButton from './ActionButtons/AutofitButton';
import DeleteButton from './ActionButtons/DeleteButton';
import GrowButton from './ActionButtons/GrowButton';
import ShrinkButton from './ActionButtons/ShrinkButton';

function ActionButtons() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Actions</FormLabel>
      <ButtonGroup orientation='vertical'>
        <DeleteButton />
        <AutofitButton />
        <ShrinkButton />
        <GrowButton />
      </ButtonGroup>
    </Box>
  );
}

export default ActionButtons;
