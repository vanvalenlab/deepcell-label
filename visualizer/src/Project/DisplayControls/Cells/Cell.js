import Avatar from '@mui/material/Avatar';
import React from 'react';
import { useHexColormap } from '../../ProjectContext';
import { contrast } from './Selected/utils';

const Cell = React.forwardRef(({ cell, onClick }, ref) => {
  const colors = useHexColormap();
  const color = colors[cell] ?? '#000000';
  const textColor = contrast(color, '#000000') > contrast(color, '#FFFFFF') ? '#000000' : '#FFFFFF';

  return (
    <Avatar
      ref={ref}
      sx={{ height: '2.5rem', width: '2.5rem', color: textColor, backgroundColor: color }}
      onClick={onClick}
    >
      {cell}
    </Avatar>
  );
});

Cell.defaultProps = {
  cell: 0,
  onClick: () => {},
};

export default Cell;
