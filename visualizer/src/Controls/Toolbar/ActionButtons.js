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

function DeleteButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;

  const tooltipText = (
    <span>
      Removes a label (<kbd>Del</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={tooltipText}
      onClick={() => send('DELETE')}
      className={styles.button}
    >
      Delete
    </ButtonWithTooltip>
  );
}

function AutofitButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;
  const grayscale = useSelector(toolbar, state =>
    state.matches('colorMode.grayscale')
  );

  const tooltipText = (
    <span>
      Fits a label's shape to the channel (<kbd>M</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={grayscale ? tooltipText : 'Requires a single channel'}
      disabled={!grayscale}
      onClick={() => send('AUTOFIT')}
      className={styles.button}
    >
      Autofit
    </ButtonWithTooltip>
  );
}

function ShrinkButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;

  const tooltipText = (
    <span>
      Contracts a label by one pixel (<kbd>Q</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={tooltipText}
      onClick={() => send('ERODE')}
      className={styles.button}
    >
      Shrink
    </ButtonWithTooltip>
  );
}

function GrowButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;

  const tooltipText = (
    <span>
      Expands a label by one pixel (<kbd>Shift</kbd> + <kbd>Q</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={tooltipText}
      onClick={() => send('DILATE')}
      className={styles.button}
    >
      Grow
    </ButtonWithTooltip>
  );
}
function SwapButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;

  const tooltipText = (
    <span>
      Switches the position of two labels (<kbd>S</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={tooltipText}
      onClick={() => send('SWAP')}
      className={styles.button}
    >
      Swap
    </ButtonWithTooltip>
  );
}

function ReplaceButton() {
  const styles = useStyles();
  const toolbar = useToolbar();
  const { send } = toolbar;

  const tooltipText = (
    <span>
      Combines two labels (<kbd>R</kbd>)
    </span>
  );

  return (
    <ButtonWithTooltip
      tooltipText={tooltipText}
      onClick={() => send('REPLACE')}
      className={styles.button}
    >
      Replace
    </ButtonWithTooltip>
  );
}

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
        <DeleteButton />
        <AutofitButton />
        <ShrinkButton />
        <GrowButton />
        <SwapButton />
        <ReplaceButton />
      </ButtonGroup>
    </Box>
  );
}
