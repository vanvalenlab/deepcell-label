
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';

import { useUndo } from '../ServiceContext';

const useStyles = makeStyles({
  button: {
    width: '50%',
  },
});

export default function UndoRedo() {
  const [state, send] = useUndo();
  const { action, numActions } = state.context;
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  const styles = useStyles();

  return <>
    <Button
      className={styles.button}
      variant="contained"
      color="primary"
      disabled={cannotUndo}
      onClick={() => send('UNDO')}
    >
      Undo
      <UndoIcon/>
    </Button >
    <Button
      className={styles.button}
      variant="contained"
      color="primary"
      disabled={cannotRedo}
      onClick={() => send('REDO')}
    >
      Redo
      <RedoIcon/>
    </Button>
  </>;
}