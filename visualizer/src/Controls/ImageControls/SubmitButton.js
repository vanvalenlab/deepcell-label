import SendIcon from '@mui/icons-material/Send';
import { Button, CircularProgress } from '@mui/material';
import { green } from '@mui/material/colors';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useApi } from '../../ProjectContext';

function SubmitButton() {
  const api = useApi();
  const { send } = api;
  const uploading = useSelector(api, (state) => state.matches('uploading'));

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<SendIcon />}
      onClick={() => send('UPLOAD')}
      disabled={uploading}
    >
      Submit
      {uploading && (
        <CircularProgress
          sx={{
            color: green[500],
            position: 'absolute',
            top: '50%',
            left: '50%',
            mt: -12,
            ml: -12,
          }}
        />
      )}
    </Button>
  );
}

export default SubmitButton;
