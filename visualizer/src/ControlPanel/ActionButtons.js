import React from 'react';
import { useSelector } from '@xstate/react';
import { makeStyles } from '@material-ui/core/styles';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';

import { useToolbar } from '../ServiceContext';

const useStyles = makeStyles(theme => ({
  button: {
    padding: theme.spacing(0.5),
  }
}));

export default function ActionButtons() {
  const toolbar = useToolbar();
  const { send } = toolbar;

  const styles = useStyles();

  return (
    <Box display='flex' flexDirection='column'>
      <ButtonGroup orientation='vertical'>
        <Button onClick={() => send('SWAP')} className={styles.button}>
          Swap
        </Button>
        <Button onClick={() => send('REPLACE')} className={styles.button}>
          Replace
        </Button>
      </ButtonGroup>
    </Box>
  );
}
