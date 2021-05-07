import React from 'react';
import { useSelector } from '@xstate/react';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Box from '@material-ui/core/Box';

import ControlRow from './ControlRow';
import { useTool } from '../ServiceContext';


export default function ToolControls() {
  const tool = useTool();
  const brushSize = useSelector(tool, state => state.context.brushSize);
  const trace = useSelector(tool, state => state.context.trace);

  return (
    <ControlRow name={"Tool"}>
      <Box display='flex' flexDirection='column'>
        <Typography gutterBottom>
          tool: {tool.state.toStrings()[0]}
        </Typography>
        <Typography gutterBottom>
          brush size: {brushSize}
        </Typography>
        <Typography gutterBottom>
          trace: {JSON.stringify(trace).substring(0, 20)}
        </Typography>
      </Box>
    </ControlRow>
  );
}
