import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useUndo } from '../ProjectContext';

export default function UndoRedo() {
  const undo = useUndo();
  const edit = useSelector(undo, (state) => state.context.edit);
  const numEdits = useSelector(undo, (state) => state.context.numEdits);
  const cannotUndo = edit === 0;
  const cannotRedo = edit === numEdits;

  useEffect(() => {
    bind('mod+z', () => undo.send('UNDO'));
    bind('mod+shift+z', () => undo.send('REDO'));
  }, [undo]);

  return (
    <Box display='flex' flexDirection='column'>
      <Button
        sx={{ width: '100%', p: 0.5, my: 0.5 }}
        variant='contained'
        color='primary'
        disabled={cannotUndo}
        onClick={() => undo.send('UNDO')}
      >
        Undo
        <UndoIcon />
      </Button>
      <Button
        sx={{ width: '100%', p: 0.5, mb: 0.5 }}
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
