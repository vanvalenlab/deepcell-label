import { Button, CircularProgress, makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import GetAppIcon from '@material-ui/icons/GetApp';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useApi } from '../../ProjectContext';

const useStyles = makeStyles(theme => ({
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
  const projectId = useSelector(api, state => state.context.projectId);

  const onDownload = () => {
    // api.send('DOWNLOAD');
    const link = document.createElement('a');
    link.download = '';
    link.href = `${document.location.origin}/api/download/${projectId}`;
    console.log(link);
    link.click();
  };
  const downloading = useSelector(api, state => state.matches('downloading'));

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<GetAppIcon />}
      onClick={onDownload}
      disabled={downloading}
    >
      Download
      {downloading && <CircularProgress className={styles.buttonProgress} />}
    </Button>
  );
}

export default DownloadButton;
