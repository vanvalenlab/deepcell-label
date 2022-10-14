import { Box, Typography, Paper } from '@mui/material';
import equal from 'fast-deep-equal';
import { useSelector } from '@xstate/react';
import { useEditCellTypes, useCanvas } from '../../../ProjectContext';

const paperStyle = {
    backgroundColor: 'black',
    opacity: '50%',
};

function EditingPrompt() {
  const editCellTypes = useEditCellTypes();
  const addingCell = useSelector(editCellTypes, (state) => state.matches('addingCell'));
  const cell = useSelector(editCellTypes, (state) => state.context.cell);
  const cellType = useSelector(editCellTypes, (state) => state.context.name);

  const canvasMachine = useCanvas();
  const [sw, scale] = useSelector(
      canvasMachine,
      (state) => [state.context.width, state.context.scale],
      equal
  );
  const toolTipWidth = scale * sw / 2 + 370;

  if (!addingCell) {
    return null;
  }

  return (
    <Box sx={{zIndex: 1, position: 'absolute', left: toolTipWidth, top: 100}}>
    <Paper style={paperStyle}>
      {cell ? (
        <Typography sx={{color: 'white'}}>
          Click again to add cell {cell} to cell type {cellType}.
        </Typography>
      ) : (
        <Typography sx={{color: 'white'}}>Click a cell to add to cell type {cellType}.</Typography>
      )}
    </Paper>
    </Box>
  );
}

export default EditingPrompt;
