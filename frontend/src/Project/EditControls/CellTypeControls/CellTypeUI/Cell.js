import Avatar from '@mui/material/Avatar';
import React from 'react';
import { useSelect, useHexColormap } from '../../../ProjectContext';
import { contrast } from '../../../DisplayControls/Cells/Selected/utils';

const Cell = React.forwardRef(({ cell }, ref) => {
  const colors = useHexColormap();
  const select = useSelect();
  const color = colors[cell] ?? '#000000';
  const textColor = contrast(color, '#000000') > contrast(color, '#ffffff') ? '#000000' : '#ffffff';


  const onClick = () => {
    select.send({ type: 'SELECT', cell: cell });
  };

  return (
    <Avatar
      ref={ref}
      onClick={onClick}
      sx={{
        height: '2.5rem',
        width: '2.5rem',
        margin: 'auto',
        right: 3,
        color: textColor,
        backgroundColor: color,
        border: color === '#ffffff' ? '0.1px solid black' : 'none',
        boxSizing: 'border-box',
      }}
    >
      {cell}
    </Avatar>
  );
});

export default Cell;
