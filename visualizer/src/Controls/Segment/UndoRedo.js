import { Box } from '@mui/material';
import MuiButton from '@mui/material/Button';
import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';
import Tooltip from '@mui/material/Tooltip';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useUndo } from '../../ProjectContext';

const useStyles = makeStyles({
  button: {
    width: '50%',
  },
});

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913
const Button = withStyles({
  root: {
    padding: 4,
    '&.Mui-disabled': {
      pointerEvents: 'auto',
    },
  },
})(MuiButton);

const ButtonWithTooltip = ({ tooltipText, disabled, onClick, ...other }) => {
  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick,
  };
  return (
    <Tooltip title={tooltipText}>
      <Button {...other} {...adjustedButtonProps} />
    </Tooltip>
  );
};

export default function UndoRedo() {
  const undo = useUndo();
  const action = useSelector(undo, (state) => state.context.action);
  const numActions = useSelector(undo, (state) => state.context.numActions);
  const cannotUndo = action === 0;
  const cannotRedo = action === numActions;

  const styles = useStyles();

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
  }, []);

  return (
    <Box display='flex' flexDirection='row'>
      <ButtonWithTooltip
        className={styles.button}
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
        className={styles.button}
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
