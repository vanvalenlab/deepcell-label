import { FormLabel } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import MuiButton from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useToolbar } from '../../ServiceContext';

const useStyles = makeStyles(theme => ({
  button: {
    padding: theme.spacing(0.5),
  },
  title: {
    margin: theme.spacing(1),
  },
}));

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

const actionEvents = [
  'ERODE',
  'DILATE',
  'SWAP',
  'REPLACE',
  'AUTOFIT',
  'DELETE',
];

export default function ActionButtons() {
  const toolbar = useToolbar();
  const { send } = toolbar;

  const styles = useStyles();

  const grayscale = useSelector(toolbar, state =>
    state.matches('colorMode.grayscale')
  );

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel className={styles.title}>Actions</FormLabel>
      <ButtonGroup orientation='vertical'>
        <ButtonWithTooltip
          tooltipText={'Press Delete'}
          onClick={() => send('DELETE')}
          className={styles.button}
        >
          Delete
        </ButtonWithTooltip>
        <ButtonWithTooltip
          tooltipText={grayscale ? 'Press T' : 'Requires a single channel'}
          disabled={!grayscale}
          onClick={() => send('AUTOFIT')}
          className={styles.button}
        >
          Autofit
        </ButtonWithTooltip>
        <ButtonWithTooltip
          tooltipText={'Press Q'}
          onClick={() => send('ERODE')}
          className={styles.button}
        >
          Shrink
        </ButtonWithTooltip>
        <ButtonWithTooltip
          tooltipText={'Press Shift + Q'}
          onClick={() => send('DILATE')}
          className={styles.button}
        >
          Grow
        </ButtonWithTooltip>
        <ButtonWithTooltip
          tooltipText={'Press S'}
          onClick={() => send('SWAP')}
          className={styles.button}
        >
          Swap
        </ButtonWithTooltip>
        <ButtonWithTooltip
          tooltipText={'Press R'}
          onClick={() => send('REPLACE')}
          className={styles.button}
        >
          Replace
        </ButtonWithTooltip>
      </ButtonGroup>
    </Box>
  );
}
