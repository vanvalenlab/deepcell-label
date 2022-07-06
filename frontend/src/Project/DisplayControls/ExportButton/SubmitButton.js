import SendIcon from '@mui/icons-material/Send';
import { Button, CircularProgress } from '@mui/material';
import { green } from '@mui/material/colors';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useExport } from '../../ProjectContext';

function SubmitButton() {
  const export_ = useExport();
  const uploading = useSelector(export_, (state) => state.matches('uploading'));

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<SendIcon />}
      onClick={() => export_.send('UPLOAD')}
      disabled={uploading}
      sx={{ position: 'relative' }}
    >
      Submit
      {uploading && (
        <CircularProgress
          sx={{
            color: green[500],
            position: 'absolute',
          }}
        />
      )}
    </Button>
  );
}

export default SubmitButton;
