import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913

const ActionButton = ({ tooltipText, disabled, onClick, hotkey, ...other }) => {
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
      <Button
        {...other}
        {...adjustedButtonProps}
        classes='MuiButtonBase-root MuiToggleButton-root MuiToggleButton-sizeMedium MuiToggleButton-standard MuiToggleButtonGroup-grouped MuiToggleButtonGroup-groupedVertical'
        sx={{
          padding: 0.5,
          '&.Mui-disabled': {
            pointerEvents: 'auto',
          },
        }}
      />
    </Tooltip>
  );
};

export default ActionButton;
