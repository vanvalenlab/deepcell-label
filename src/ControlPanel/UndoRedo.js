
import React from 'react';
import Button from '@material-ui/core/Button';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';

import { useUndo } from '../ServiceContext';

export default function UndoRedo() {
  const [state, send] = useUndo();
  const { action, numActions } = state.context;
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  return <>
    <Button variant="contained" color="primary" disabled={cannotUndo} onClick={() => send('UNDO')}>
      Undo
      <UndoIcon/>
    </Button >
    <Button variant="contained" color="primary" disabled={cannotRedo} onClick={() => send('REDO')}>
      Redo
      <RedoIcon/>
    </Button>
  </>;
}