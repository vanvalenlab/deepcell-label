import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { useActor } from '@xstate/react';


import ControlRow from './ControlRow';
import { useTool } from '../ServiceContext';


export default function LabelControls() {
  const tool = useTool();
  const [current, send] = useActor(tool);
  const { x, y, label, foreground, background } = current.context;

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
