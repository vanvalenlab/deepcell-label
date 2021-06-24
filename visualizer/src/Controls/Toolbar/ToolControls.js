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

const tooltips = {
  select: (
    <span>
      Click to pick the foreground.
      <br />
      Click the foreground to make it the background. (<kbd>V</kbd>)
    </span>
  ),
  brush: (
    <span>
      Click and drag to paint a label (<kbd>B</kbd>)
    </span>
  ),
  eraser: (
    <span>
      Click and drag to erase a label (<kbd>E</kbd>)
    </span>
  ),
  trim: (
    <span>
      Click a label to remove unconnected parts (<kbd>K</kbd>)
    </span>
  ),
  flood: (
    <span>
      Click a region to fill it with a label (<kbd>G</kbd>)
    </span>
  ),
  threshold: (
    <span>
      Click and drag to fill in the brightest pixels in a box (<kbd>T</kbd>)
    </span>
  ),
  watershed: (
    <span>
      Click on two spots in the same label to split it (<kbd>W</kbd>)
    </span>
  ),
};

export default function ToolControls() {
  const styles = useStyles();

  const toolbar = useToolbar();
  const grayscale = useSelector(toolbar, state =>
    state.matches('colorMode.grayscale')
  );
  const tool = useSelector(toolbar, state => state.context.tool);
  const erasing = useSelector(toolbar, state => state.context.foreground === 0);
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
          tooltipText={tooltips.select}
          value='select'
          selected={tool === 'select'}
        >
          Select
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={tooltips.brush}
          value='brush'
          selected={tool === 'brush' && !erasing}
        >
          Brush
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={tooltips.eraser}
          value='eraser'
          selected={tool === 'brush' && erasing}
        >
          Eraser
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={tooltips.trim}
          value='trim'
          selected={tool === 'trim'}
        >
          Trim
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={tooltips.flood}
          value='flood'
          selected={tool === 'flood'}
        >
          Flood
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={
            grayscale ? tooltips.threshold : 'Requires a single channel'
          }
          value='threshold'
          selected={tool === 'threshold'}
          disabled={!grayscale}
        >
          Threshold
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText={
            grayscale ? tooltips.watershed : 'Requires a single channel'
          }
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
