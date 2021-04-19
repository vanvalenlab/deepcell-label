import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { useSelector } from '@xstate/react';


import ControlRow from './ControlRow';
import { useTool } from '../ServiceContext';


export default function LabelControls() {
  const tool = useTool();
  const x = useSelector(tool, state => state.context.x);
  const y = useSelector(tool, state => state.context.y);
  const label = useSelector(tool, state => state.context.label);
  const foreground = useSelector(tool, state => state.context.foreground);
  const background = useSelector(tool, state => state.context.background);

  return (
    <ControlRow name={"Label"}>
      <Box display='flex' flexDirection='column'>
        <Typography gutterBottom>
          x: {x}
        </Typography>
        <Typography gutterBottom>
          y: {y}
        </Typography>
        <Typography gutterBottom>
          Label: {label}
        </Typography>
        <Typography gutterBottom>
          foreground: {foreground === 0 ? 'no label' : foreground}
        </Typography>
        <Typography gutterBottom>
          background: {background === 0 ? 'no label' : background}
        </Typography>
      </Box>
    </ControlRow>
  );
}
