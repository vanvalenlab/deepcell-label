
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';

import { useUndo } from '../ServiceContext';
import { useSelector } from '@xstate/react';

const useStyles = makeStyles({
  button: {
    width: '50%',
  },
});

export default function UndoRedo() {
  const undo = useUndo();
  const action = useSelector(undo, state => state.context.action);
  const numActions = useSelector(undo, state => state.context.numActions);
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  const styles = useStyles();

  return <>
    <Button
      className={styles.button}
      variant="contained"
      color="primary"
      disabled={cannotUndo}
      onClick={() => undo.send('UNDO')}
    >
      Undo
      <UndoIcon/>
    </Button >
    <Button
      className={styles.button}
      variant="contained"
      color="primary"
      disabled={cannotRedo}
      onClick={() => undo.send('REDO')}
    >
      Redo
      <RedoIcon/>
    </Button>
  </>;
}