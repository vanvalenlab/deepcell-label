import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913

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
    <Tooltip title={tooltipText} placement='right'>
      <ToggleButton
        {...rest}
        {...adjustedButtonProps}
        sx={{
          px: 0.5,
          py: 0,
          '&.Mui-disabled': {
            pointerEvents: 'auto',
          },
        }}
      />
    </Tooltip>
  );
}

export default ToolButton;
