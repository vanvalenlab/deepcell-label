import Avatar from '@mui/material/Avatar';
import React from 'react';
import { useHexColormap } from '../../../ProjectContext';

const Cell = React.forwardRef(({ cell, onClick }, ref) => {
  const colors = useHexColormap();
  const color = colors[cell] ?? '#000000';

  if (!cell) {
    return null;
  }

  return (
    <Avatar
      ref={ref}
      sx={{ my: 0.25, mx: 1, height: '2.5rem', width: '2.5rem', backgroundColor: color }}
      onClick={onClick}
    >
      {cell}
    </Avatar>
  );
});

export default Cell;
