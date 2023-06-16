import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { Box, FormLabel, IconButton, Tooltip, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { useCallback, useEffect } from 'react';
import { useEditCellTypes, useSelect, useSelectedCell } from '../../../ProjectContext';

function CellNavigation({ currentCellTypes }) {
  const select = useSelect();
  const selected = useSelectedCell();
  const editCellTypes = useEditCellTypes();
  const cellTypeOpen = useSelector(editCellTypes, (state) => state.context.cellTypeOpen);

  // Get the cells of the currently opened cell type
  let cellsOpen = null;
  let cellTypeOpenName = null;
  if (cellTypeOpen) {
    cellsOpen = currentCellTypes.find((cellType) => cellType.id === cellTypeOpen).cells;
    cellTypeOpenName = currentCellTypes.find((cellType) => cellType.id === cellTypeOpen).name;
  }

  // Select the smallest element in cellsOpen that is higher than the value of the current selected cell
  const handleRight = useCallback(() => {
    if (cellsOpen) {
      const nextCell = cellsOpen.find((cell) => cell > selected);
      if (nextCell) {
        select.send({ type: 'SELECT', cell: nextCell });
      }
    }
  }, [cellsOpen, selected, select]);

  // Select the largest element in cellsOpen that is lower than the value of the current selected cell
  const handleLeft = useCallback(() => {
    if (cellsOpen) {
      const reversed = [...cellsOpen].reverse();
      const prevCell = reversed.find((cell) => cell < selected);
      if (prevCell) {
        select.send({ type: 'SELECT', cell: prevCell });
      }
    }
  }, [cellsOpen, selected, select]);

  // Bind the left and right arrow keys to the handleLeft and handleRight functions with mousetrap
  useEffect(() => {
    bind('left', handleLeft);
    bind('right', handleRight);
    return () => {
      unbind('left');
      unbind('right');
    };
  }, [handleLeft, handleRight]);

  return (
    <Box>
      <FormLabel
        sx={{
          display: 'inline-block',
          mr: 1,
          fontSize: 14,
        }}
      >
        Selected Cell:
      </FormLabel>
      {selected > 0 ? ( // If there is no selected cell don't display anything
        <Box sx={{ display: 'inline-block' }}>
          <Tooltip
            title={
              <span>
                Previous {cellTypeOpenName} <kbd>←</kbd>
              </span>
            }
          >
            {/* Span is needed to make the tooltip not error out when the button is disabled */}
            <span>
              <IconButton onClick={handleLeft} disabled={!cellTypeOpen}>
                <ArrowLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ display: 'inline-block', fontWeight: 'bold' }}>{selected}</Typography>
          <Tooltip
            title={
              <span>
                Next {cellTypeOpenName} <kbd>→</kbd>
              </span>
            }
          >
            <span>
              <IconButton onClick={handleRight} disabled={!cellTypeOpen}>
                <ArrowRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ) : null}
    </Box>
  );
}

export default CellNavigation;
