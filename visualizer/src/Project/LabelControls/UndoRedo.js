import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useUndo } from '../ProjectContext';

export default function UndoRedo() {
  const undo = useUndo();
  const action = useSelector(undo, (state) => state.context.action);
  const numActions = useSelector(undo, (state) => state.context.numActions);
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  useEffect(() => {
    bind('mod+z', () => undo.send('UNDO'));
    bind('mod+shift+z', () => undo.send('REDO'));
  }, [undo]);

  return (
    <Box display='flex' flexDirection='row'>
      <Button
        sx={{ width: '50%', p: 0.5 }}
        variant='contained'
        color='primary'
        disabled={cannotUndo}
        onClick={() => undo.send('UNDO')}
      >
        Undo
        <UndoIcon />
      </Button>
      <Button
        sx={{ width: '50%', p: 0.5 }}
        variant='contained'
        color='primary'
        disabled={cannotRedo}
        onClick={() => undo.send('REDO')}
      >
        Redo
        <RedoIcon />
      </Button>
    </Box>
  );
}
