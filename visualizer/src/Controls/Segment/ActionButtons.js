import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import makeStyles from '@mui/styles/makeStyles';
import React from 'react';
import AutofitButton from './ActionButtons/AutofitButton';
import DeleteButton from './ActionButtons/DeleteButton';
import GrowButton from './ActionButtons/GrowButton';
import ReplaceButton from './ActionButtons/ReplaceButton';
import ShrinkButton from './ActionButtons/ShrinkButton';
import SwapButton from './ActionButtons/SwapButton';

const useStyles = makeStyles((theme) => ({
  title: {
    margin: theme.spacing(1),
  },
}));

function ActionButtons() {
  const styles = useStyles();

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel className={styles.title}>Actions</FormLabel>
      <ButtonGroup orientation='vertical'>
        <DeleteButton />
        <AutofitButton />
        <ShrinkButton />
        <GrowButton />
        <SwapButton />
        <ReplaceButton />
      </ButtonGroup>
    </Box>
  );
}

export default ActionButtons;
