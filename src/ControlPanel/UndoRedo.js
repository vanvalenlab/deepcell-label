
import React from 'react';
import Button from '@material-ui/core/Button';

import { useUndo } from '../ServiceContext';

export default function UndoRedo() {
  const [state, send] = useUndo();

  return <>
    <Button variant="contained" color="primary" onClick={() => send('UNDO')}>
      Undo
    </Button >
    <Button variant="contained" color="primary" onClick={() => send('REDO')}>
      Redo
    </Button>
  </>;
}