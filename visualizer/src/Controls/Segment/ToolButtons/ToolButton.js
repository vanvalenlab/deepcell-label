import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';
import Tooltip from '@mui/material/Tooltip';
import MuiToggleButton from '@mui/material/ToggleButton';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';

const useStyles = makeStyles((theme) => ({
  title: {
    margin: theme.spacing(1),
  },
}));

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
