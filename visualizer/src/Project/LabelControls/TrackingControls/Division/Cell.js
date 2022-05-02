import Avatar from '@mui/material/Avatar';
import React from 'react';
import { useHexColormap } from '../../../ProjectContext';

const Cell = React.forwardRef(({ label, onClick }, ref) => {
  const colors = useHexColormap();
  const color = colors[label] ?? '#000000';

  if (!label) {
    return null;
  }

  return (
    <Avatar
      ref={ref}
      sx={{ m: 1, height: '2.5rem', width: '2.5rem', backgroundColor: color }}
      onClick={onClick}
    >
      {label}
    </Avatar>
  );
});

export default Cell;
