import MuiToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import withStyles from '@mui/styles/withStyles';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913
const ToggleButton = withStyles({
  root: {
    padding: 4,
    '&.Mui-disabled': {
      pointerEvents: 'auto',
    },
  },
})(MuiToggleButton);

function ToolButton(props) {
  const { hotkey, tooltipText, disabled, onClick, ...rest } = props;

  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick,
  };

  useEffect(() => {
    bind(hotkey, onClick);
  }, [hotkey, onClick]);

  return (
    <Tooltip title={tooltipText}>
      <ToggleButton {...rest} {...adjustedButtonProps} />
    </Tooltip>
  );
}

export default ToolButton;
