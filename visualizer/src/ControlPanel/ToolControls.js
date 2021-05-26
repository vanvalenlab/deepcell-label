import React from 'react';
import { useActor, useSelector } from '@xstate/react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Box from '@material-ui/core/Box';

import { useToolbar } from '../ServiceContext';


export default function ToolControls() {
  const toolbar = useToolbar();
  const [current, send] = useActor(toolbar);
  const { tool } = current.context;
  // const brushSize = useSelector(tool, state => state.context.brushSize);
  // const trace = useSelector(tool, state => state.context.trace);
  const isGrayscale = current.matches('grayscale');

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
      <ToggleButtonGroup orientation="vertical" exclusive onChange={handleChange}>
        <ToggleButton value="select" selected={tool === 'select'}>
          Select
        </ToggleButton>
        <ToggleButton value="brush" selected={tool === 'brush'}>
          Brush
        </ToggleButton>
        {current.matches('grayscale') && <ToggleButton value="threshold" selected={tool === 'threshold'}>
          Threshold
        </ToggleButton>}
        {/* <ToggleButton value="trim" selected={tool === 'trim'}>
          Trim
        </ToggleButton> */}
        {/* <ToggleButton value="flood" selected={tool === 'flood'}>
          Flood
        </ToggleButton> */}
        {/* <ToggleButton value="erodeDilate" selected={tool === 'erodeDilate'}>
          Grow/Shrink
        </ToggleButton> */}
        {current.matches('grayscale') && <ToggleButton value="autofit" selected={tool === 'autofit'}>
          Autofit
        </ToggleButton>}
        {/* {current.matches('grayscale') && <ToggleButton value="watershed" selected={tool === 'watershed'}>
          Watershed
        </ToggleButton> */}
      </ToggleButtonGroup>
    </Box>
  );
}
