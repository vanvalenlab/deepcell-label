import { Box } from '@mui/material';
import React from 'react';
import { useImage } from '../../ProjectContext';

function FrameBox({ frame, numFrames, color }) {
  const image = useImage();

  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height: '0.5rem',
    width: `${(1 / numFrames) * 100}%`,
    left: `${(frame / numFrames) * 100}%`,
    pointerEvents: 'none',
  };

  const onClick = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'SET_FRAME', frame: newValue });
    }
  };

  return <Box sx={boxStyle} onClick={onClick}></Box>;
}

export default FrameBox;
