import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ClearIcon from '@mui/icons-material/Clear';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useSelect } from '../../../ProjectContext';
import Cell from '../Cell';

function Selected() {
  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);

  useEffect(() => {
    const listener = (e) => {
      switch (e.key) {
        case 'Escape':
          select.send('RESET');
          break;
        case 'n':
          select.send('SELECT_NEW');
          break;
        case '[':
          select.send('SELECT_PREVIOUS');
          break;
        case ']':
          select.send('SELECT_NEXT');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [select]);

  const [showButtons, setShowButtons] = useState(false);
  const color = '#000000';

  const newTooltip = (
    <span>
      New <kbd>N</kbd>
    </span>
  );

  const resetTooltip = (
    <span>
      Reset <kbd>Esc</kbd>
    </span>
  );

  const prevTooltip = (
    <span>
      Previous <kbd>[</kbd>
    </span>
  );

  const nextTooltip = (
    <span>
      Next <kbd>]</kbd>
    </span>
  );

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        p: 1,
      }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      <Cell cell={cell} />
      {showButtons && (
        <Tooltip title={newTooltip}>
          <IconButton
            sx={{ position: 'absolute', top: -5, left: -5 }}
            size='small'
            onClick={() => select.send('SELECT_NEW')}
          >
            <AddIcon sx={{ color }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={resetTooltip}>
          <IconButton
            sx={{ position: 'absolute', top: -5, right: -5 }}
            size='small'
            onClick={() => select.send('RESET')}
          >
            <ClearIcon sx={{ color }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={prevTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: -5, left: -5 }}
            size='small'
            onClick={() => select.send('SELECT_PREVIOUS')}
          >
            <ArrowBackIosNewIcon sx={{ color }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={nextTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: -5, right: -5 }}
            size='small'
            onClick={() => select.send('SELECT_NEXT')}
          >
            <ArrowForwardIosIcon sx={{ color }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default Selected;
