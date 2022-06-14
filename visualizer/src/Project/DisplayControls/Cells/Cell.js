import Avatar from '@mui/material/Avatar';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useHexColormap, useLabeled, useSelectedCell } from '../../ProjectContext';
import { contrast } from './Selected/utils';

const Cell = React.forwardRef(({ cell, onClick }, ref) => {
  const labeled = useLabeled();
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const selected = useSelectedCell();

  const colors = useHexColormap();
  const color =
    highlight && cell === selected && cell !== 0 ? '#ff0000' : colors[cell] ?? '#000000';
  const textColor = contrast(color, '#000000') > contrast(color, '#ffffff') ? '#000000' : '#ffffff';

  return (
    <Avatar
      ref={ref}
      sx={{
        height: '2.5rem',
        width: '2.5rem',
        color: textColor,
        backgroundColor: color,
        border: color === '#ffffff' ? '0.1px solid black' : 'none',
        boxSizing: 'border-box',
      }}
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
