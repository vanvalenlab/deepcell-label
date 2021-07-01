import { Button } from '@material-ui/core';
import ImageSearchIcon from '@material-ui/icons/ImageSearch';
import React from 'react';
import { useValidate } from '../../ServiceContext';

function CheckButton() {
  const validate = useValidate();
  const { send } = validate;

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<ImageSearchIcon />}
      onClick={() => send('VALIDATE_LABELS')}
    >
      Check
    </Button>
  );
}

export default CheckButton;
