import { Button, CircularProgress, makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import SendIcon from '@material-ui/icons/Send';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useApi } from '../../ServiceContext';

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

function SubmitButton() {
  const api = useApi();
  const { send } = api;
  const uploading = useSelector(api, state => state.matches('uploading'));

  const styles = useStyles();

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<SendIcon />}
      onClick={() => send('UPLOAD')}
      disabled={uploading}
    >
      Submit
      {uploading && <CircularProgress className={styles.buttonProgress} />}
    </Button>
  );
}

export default SubmitButton;
