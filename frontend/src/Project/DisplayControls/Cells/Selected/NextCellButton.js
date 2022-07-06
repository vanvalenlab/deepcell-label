import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import { useSelect } from '../../../ProjectContext';

function NextCellButton({ sx }) {
  const select = useSelect();

  const tooltip = (
    <span>
      Next <kbd>]</kbd>
    </span>
  );

  return (
    <Tooltip title={tooltip}>
      <IconButton sx={{ ...sx, p: 0 }} size='small' onClick={() => select.send('SELECT_NEXT')}>
        <ArrowForwardIosIcon />
      </IconButton>
    </Tooltip>
  );
}

export default NextCellButton;
