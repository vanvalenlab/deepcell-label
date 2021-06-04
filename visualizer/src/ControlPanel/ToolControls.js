import React from 'react';
import { useSelector } from '@xstate/react';
import { withStyles } from '@material-ui/core/styles';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import MuiToggleButton from '@material-ui/lab/ToggleButton';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';

import { useToolbar } from '../ServiceContext';

// for adding tooltip to disabled buttons
// from https://stackoverflow.com/questions/61115913
const ToggleButton = withStyles({
  root: {
    '&.Mui-disabled': {
      pointerEvents: 'auto'
    }
  }
})(MuiToggleButton);

const ToggleButtonWithTooltip = ({ tooltipText, disabled, onClick, ...other }) => {
  const adjustedButtonProps = {
    disabled: disabled,
    component: disabled ? 'div' : undefined,
    onClick: disabled ? undefined : onClick
  };
  return (
    <Tooltip title={ tooltipText }>
      <ToggleButton {...other} {...adjustedButtonProps} />
    </Tooltip>
  );
};


export default function ToolControls() {
  const toolbar = useToolbar();
  // const brushSize = useSelector(tool, state => state.context.brushSize);
  // const trace = useSelector(tool, state => state.context.trace);
  const grayscale = useSelector(toolbar, state => state.matches('grayscale'));
  const tool = useSelector(toolbar, state => state.context.tool);
  const { send } = toolbar;

  const handleChange = (event, value) => {
    const lookup = {
      brush: 'USE_BRUSH',
      select: 'USE_SELECT',
      threshold: 'USE_THRESHOLD',
      trim: 'USE_TRIM',
      flood: 'USE_FLOOD',
      erodeDilate: 'USE_ERODE_DILATE',
      autofit: 'USE_AUTOFIT',
      watershed: 'USE_WATERSHED',
    };

    if (value in lookup) {
      send(lookup[value]);
    }
  };

  return (
    <Box display='flex' flexDirection='column'>
      <ToggleButtonGroup orientation='vertical' exclusive onChange={handleChange}>
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
          tooltipText={ grayscale ? 'Press T' : 'Requires a single channel'}
          value='threshold' 
          selected={tool === 'threshold'}
          disabled={!grayscale}
        >
          Threshold
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip 
          tooltipText={ grayscale ? 'Press M' : 'Requires a single channel'}
          value='autofit' 
          selected={tool === 'autofit'}
          disabled={!grayscale}
        >
          Autofit
        </ToggleButtonWithTooltip>
        <ToggleButtonWithTooltip 
          tooltipText={ grayscale ? 'Press W' : 'Requires a single channel'}
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
