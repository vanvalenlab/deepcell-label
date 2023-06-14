import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { Box, FormLabel, IconButton, Tooltip, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
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
  const handleRight = () => {
    if (cellsOpen) {
      const nextCell = cellsOpen.find((cell) => cell > selected);
      if (nextCell) {
        select.send({ type: 'SELECT', cell: nextCell });
      }
    }
  };

  // Select the largest element in cellsOpen that is lower than the value of the current selected cell
  const handleLeft = () => {
    if (cellsOpen) {
      const reversed = [...cellsOpen].reverse();
      const prevCell = reversed.find((cell) => cell < selected);
      if (prevCell) {
        select.send({ type: 'SELECT', cell: prevCell });
      }
    }
  };

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
          <Tooltip title={`Previous ${cellTypeOpenName}`}>
            {/* Span is needed to make the tooltip not error out when the button is disabled */}
            <span>
              <IconButton onClick={handleLeft} disabled={!cellTypeOpen}>
                <ArrowLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ display: 'inline-block', fontWeight: 'bold' }}>{selected}</Typography>
          <Tooltip title={`Next ${cellTypeOpenName}`}>
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
