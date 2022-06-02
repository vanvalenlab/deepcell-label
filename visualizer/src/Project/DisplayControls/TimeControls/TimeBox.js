import { Box } from '@mui/material';
import React from 'react';
import { useImage } from '../../ProjectContext';

function TimeBox({ t, duration, color }) {
  const image = useImage();

  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height: '0.5rem',
    width: `${(1 / duration) * 100}%`,
    left: `${(t / duration) * 100}%`,
    pointerEvents: 'none',
  };

  const onClick = (event, newValue) => {
    if (newValue !== t) {
      image.send({ type: 'SET_T', t: newValue });
    }
  };

  return <Box sx={boxStyle} onClick={onClick}></Box>;
}

export default TimeBox;
