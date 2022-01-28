import { Button, CircularProgress } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { green } from '@mui/material/colors';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useApi } from '../../ProjectContext';

const useStyles = makeStyles((theme) => ({
  buttonProgress: {
    color: green[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
}));

function DownloadButton() {
  const styles = useStyles();
  const api = useApi();
  const downloading = useSelector(api, (state) => state.matches('downloading'));

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<GetAppIcon />}
      onClick={() => api.send('DOWNLOAD')}
      disabled={downloading}
    >
      Download
      {downloading && <CircularProgress className={styles.buttonProgress} />}
    </Button>
  );
}

export default DownloadButton;
