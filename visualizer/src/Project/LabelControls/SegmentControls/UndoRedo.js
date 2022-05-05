import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useUndo } from '../../ProjectContext';

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913

const ButtonWithTooltip = ({ tooltipText, disabled, onClick, ...other }) => {
  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick,
  };
  return (
    <Tooltip title={tooltipText}>
      <Button
        sx={{
          p: 0.5,
          '&.Mui-disabled': {
            pointerEvents: 'auto',
          },
        }}
        {...other}
        {...adjustedButtonProps}
      />
    </Tooltip>
  );
};

export default function UndoRedo() {
  const undo = useUndo();
  const action = useSelector(undo, (state) => state.context.action);
  const numActions = useSelector(undo, (state) => state.context.numActions);
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  const undoTooltip = (
    <>
      <kbd>Ctrl</kbd>+<kbd>Z</kbd>
    </>
  );
  const redoTooltip = (
    <>
      <kbd>Shift</kbd>+<kbd>Ctrl</kbd>+<kbd>Z</kbd>
    </>
  );

  useEffect(() => {
    bind('mod+z', () => undo.send('UNDO'));
    bind('mod+shift+z', () => undo.send('REDO'));
  }, [undo]);

  return (
    <Box display='flex' flexDirection='row'>
      <ButtonWithTooltip
        sx={{ width: '50%' }}
        tooltipText={undoTooltip}
        variant='contained'
        color='primary'
        disabled={cannotUndo}
        onClick={() => undo.send('UNDO')}
      >
        Undo
        <UndoIcon />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        tooltipText={redoTooltip}
        sx={{ width: '50%' }}
        variant='contained'
        color='primary'
        disabled={cannotRedo}
        onClick={() => undo.send('REDO')}
      >
        Redo
        <RedoIcon />
      </ButtonWithTooltip>
    </Box>
  );
}
