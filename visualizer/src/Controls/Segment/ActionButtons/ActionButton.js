import MuiButton from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import withStyles from '@mui/styles/withStyles';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';

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

const ActionButton = ({ tooltipText, disabled, onClick, hotkey, ...other }) => {
  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick,
    sx: { padding: 0.5 },
  };

  useEffect(() => {
    bind(hotkey, onClick);
  }, [hotkey, onClick]);

  return (
    <Tooltip title={tooltipText}>
      <Button {...other} {...adjustedButtonProps} />
    </Tooltip>
  );
};

export default ActionButton;
