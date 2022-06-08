import { Box } from '@mui/material';
import React from 'react';
import { useImage } from '../../ProjectContext';

function TimeBox({ t, duration, color }) {
  const image = useImage();
  const width = (1 / (duration - 1)) * 100;
  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height: '0.5rem',
    width: t === 0 || t === duration - 1 ? `calc(${width / 2}% + 1px)` : `calc(${width}% + 1px)`,
    left: t === 0 ? 0 : `${width * (t - 0.5)}%`,
  };

  const onClick = (event, newValue) => {
    image.send({ type: 'SET_T', t });
  };

  return <Box sx={boxStyle} onClick={onClick}></Box>;
}

export default TimeBox;
