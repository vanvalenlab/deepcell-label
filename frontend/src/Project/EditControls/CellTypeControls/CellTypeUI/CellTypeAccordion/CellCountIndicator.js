import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import { useSelector } from '@xstate/react';
import { useCellTypes } from '../../../../ProjectContext';

function CellCountIndicator({ id }) {
  const cellTypes = useCellTypes();

  const cellTypeList = useSelector(cellTypes, (state) => state.context.cellTypes);
  const cellType = cellTypeList.filter((cellType) => cellType.id === id)[0];
  const numCells = cellType.cells.length;
  const width = numCells > 999 ? '4em' : '3em';

  let paperStyle = {
    position: 'absolute',
    marginLeft: '12.5em',
    marginTop: '0.15em',
  };

  return (
    <Box sx={paperStyle}>
      <Chip size='small' label={numCells} sx={{ width: width }} />
    </Box>
  );
}

export default CellCountIndicator;
