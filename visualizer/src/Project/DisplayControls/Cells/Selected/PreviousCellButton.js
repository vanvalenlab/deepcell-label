import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import { useSelect } from '../../../ProjectContext';

function PreviousCellButton({ sx }) {
  const select = useSelect();

  const tooltip = (
    <span>
      Previous <kbd>[</kbd>
    </span>
  );

  return (
    <Tooltip title={tooltip}>
      <IconButton sx={{ ...sx, p: 0 }} size='small' onClick={() => select.send('SELECT_PREVIOUS')}>
        <ArrowBackIosNewIcon />
      </IconButton>
    </Tooltip>
  );
}

export default PreviousCellButton;
