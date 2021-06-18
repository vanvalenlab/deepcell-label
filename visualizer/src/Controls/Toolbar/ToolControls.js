import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';
import { withStyles } from '@material-ui/core/styles';
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

export default function ToolControls() {
  const toolbar = useToolbar();
  // const brushSize = useSelector(tool, state => state.context.brushSize);
  // const trace = useSelector(tool, state => state.context.trace);
  const grayscale = useSelector(toolbar, state =>
    state.matches('colorMode.grayscale')
  );
  const tool = useSelector(toolbar, state => state.context.tool);
  const { send } = toolbar;

  const handleChange = (event, value) => {
    const lookup = {
      brush: 'brush',
      select: 'select',
      threshold: 'threshold',
      trim: 'trim',
      flood: 'flood',
      erodeDilate: 'erodeDilate',
      autofit: 'autofit',
      watershed: 'watershed',
      delete: 'delete',
    };

    if (value in lookup) {
      send({ type: 'USE_TOOL', tool: lookup[value] });
    }
  };

  return (
    <Box display='flex' flexDirection='column'>
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
          selected={tool === 'brush'}
        >
          Brush
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
          tooltipText='Press Q'
          value='erodeDilate'
          selected={tool === 'erodeDilate'}
        >
          Grow/Shrink
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip
          tooltipText='Press Delete'
          value='delete'
          selected={tool === 'delete'}
        >
          Delete
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
          tooltipText={grayscale ? 'Press M' : 'Requires a single channel'}
          value='autofit'
          selected={tool === 'autofit'}
          disabled={!grayscale}
        >
          Autofit
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
