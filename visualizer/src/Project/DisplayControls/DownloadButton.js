import GetAppIcon from '@mui/icons-material/GetApp';
import { Button, CircularProgress } from '@mui/material';
import { green } from '@mui/material/colors';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useApi } from '../ProjectContext';

function DownloadButton() {
  const api = useApi();
  const downloading = useSelector(api, (state) => state.matches('downloading'));

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<GetAppIcon />}
      onClick={() => api.send('DOWNLOAD')}
      disabled={downloading}
      sx={{ position: 'relative' }}
    >
      Download
      {downloading && (
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

export default DownloadButton;
