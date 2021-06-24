import { FormLabel } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import MuiToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useToolbar } from '../../ServiceContext';

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

const ToggleButtonWithTooltip = ({
  tooltipText,
  disabled,
  onClick,
  ...other
}) => {
  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick,
  };
  return (
    <Tooltip title={tooltipText}>
      <ToggleButton {...other} {...adjustedButtonProps} />
    </Tooltip>
  );
};

const useStyles = makeStyles(theme => ({
  title: {
    margin: theme.spacing(1),
  },
}));

export default function ToolControls() {
  const styles = useStyles();

  const toolbar = useToolbar();
  const grayscale = useSelector(toolbar, state =>
    state.matches('colorMode.grayscale')
  );
  const tool = useSelector(toolbar, state => state.context.tool);
  const eraser = useSelector(toolbar, state => state.context.foreground === 0);
  const { send } = toolbar;

  const handleChange = (event, value) => {
    const lookup = {
      brush: 'USE_BRUSH',
      eraser: 'USE_ERASER',
      select: 'USE_SELECT',
      threshold: 'USE_THRESHOLD',
      trim: 'USE_TRIM',
      flood: 'USE_FLOOD',
      watershed: 'USE_WATERSHED',
    };

    if (value in lookup) {
      send({ type: lookup[value] });
    }
  };

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel className={styles.title}>Tools</FormLabel>
      <ToggleButtonGroup
        orientation='vertical'
        exclusive
        onChange={handleChange}
      >
        <ToggleButtonWithTooltip
          tooltipText='Press V'
          value='select'
          selected={tool === 'select'}
        >
          Select
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText='Press B'
          value='brush'
          selected={tool === 'brush' && !eraser}
        >
          Brush
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText='Press E'
          value='eraser'
          selected={tool === 'brush' && eraser}
        >
          Eraser
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText='Press K'
          value='trim'
          selected={tool === 'trim'}
        >
          Trim
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText='Press G'
          value='flood'
          selected={tool === 'flood'}
        >
          Flood
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={grayscale ? 'Press T' : 'Requires a single channel'}
          value='threshold'
          selected={tool === 'threshold'}
          disabled={!grayscale}
        >
          Threshold
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={grayscale ? 'Press W' : 'Requires a single channel'}
          value='watershed'
          selected={tool === 'watershed'}
          disabled={!grayscale}
        >
          Watershed
        </ToggleButtonWithTooltip>
      </ToggleButtonGroup>
    </Box>
  );
}
