import { makeStyles, withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import MuiToggleButton from '@material-ui/lab/ToggleButton';
import { bind, unbind } from 'mousetrap';
import React, { useEffect } from 'react';

const useStyles = makeStyles(theme => ({
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
    return () => unbind(hotkey);
  }, [hotkey, onClick]);

  return (
    <Tooltip title={tooltipText}>
      <ToggleButton {...rest} {...adjustedButtonProps} />
    </Tooltip>
  );
}

export default ToolButton;
