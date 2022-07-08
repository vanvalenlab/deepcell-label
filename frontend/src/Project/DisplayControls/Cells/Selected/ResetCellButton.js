import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import { useSelect } from '../../../ProjectContext';

function ResetCellButton({ sx }) {
  const select = useSelect();

  const tooltip = (
    <span>
      Reset <kbd>Esc</kbd>
    </span>
  );

  return (
    <Tooltip title={tooltip}>
      <IconButton sx={{ ...sx, p: 0 }} size='small' onClick={() => select.send('RESET')}>
        <ClearIcon />
      </IconButton>
    </Tooltip>
  );
}

export default ResetCellButton;
