import { Box } from '@mui/material';
import React from 'react';

function TimeBox({ start, end, duration, color, height }) {
  const boxWidth = (1 / (duration - 1)) * 100;
  let numBoxes = end - start;
  if (start === 0) {
    numBoxes -= 0.5;
  }
  if (end === duration) {
    numBoxes -= 0.5;
  }

  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height,
    width: `${numBoxes * boxWidth}%`,
    left: start === 0 ? 0 : `${boxWidth * (start - 0.5)}%`,
  };

  return <Box sx={boxStyle}></Box>;
}

export default TimeBox;
