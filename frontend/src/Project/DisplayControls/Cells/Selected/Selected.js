import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useEditCellTypes, useSelect } from '../../../ProjectContext';
import Cell from '../Cell';
import NewCellButton from './NewCellButton';
import NextCellButton from './NextCellButton';
import PreviousCellButton from './PreviousCellButton';
import ResetCellButton from './ResetCellButton';

let numMounted = 0;

function Selected() {
  const select = useSelect();
  const editCellTypes = useEditCellTypes();
  const cell = useSelector(select, (state) => state.context.selected);

  useEffect(() => {
    const listener = (e) => {
      switch (e.key) {
        case 'Escape':
          select.send('RESET');
          editCellTypes.send('RESET');
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
    if (numMounted === 0) {
      window.addEventListener('keydown', listener);
    }
    numMounted++;
    return () => {
      numMounted--;
      if (numMounted === 0) {
        window.removeEventListener('keydown', listener);
      }
    };
  }, [select]);

  const [showButtons, setShowButtons] = useState(false);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        width: 'fit-content',
        p: 1,
      }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      <Cell cell={cell} />
      {showButtons && (
        <>
          <NewCellButton sx={{ position: 'absolute', top: -5, left: -5 }} />
          <ResetCellButton sx={{ position: 'absolute', top: -5, right: -5 }} />
          <PreviousCellButton sx={{ position: 'absolute', bottom: -5, left: -5 }} />
          <NextCellButton sx={{ position: 'absolute', bottom: -5, right: -5 }} />
        </>
      )}
    </Box>
  );
}

export default Selected;
