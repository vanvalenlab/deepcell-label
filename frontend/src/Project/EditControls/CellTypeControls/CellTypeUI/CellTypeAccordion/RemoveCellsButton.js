import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import EggAltIcon from '@mui/icons-material/EggAlt';
import { IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../../../ProjectContext';

function RemoveCellsButton({ id, name }) {
  const editCellTypes = useEditCellTypes();
  const addingCell = useSelector(editCellTypes, (state) => state.matches('addingCell'));
  const removingCell = useSelector(editCellTypes, (state) => state.matches('removingCell'));

  // Handle logic for resetting remove mode
  const handleReset = () => {
    if (addingCell || removingCell) {
      editCellTypes.send({ type: 'RESET' });
    }
  };

  // Handle starting the remove mode
  const handleRemove = () => {
    editCellTypes.send({ type: 'REMOVE_MODE', cellType: id, name: name });
  };

  return !removingCell ? (
    <Tooltip title='Remove Cells' enterDelay={500} enterNextDelay={500}>
      <IconButton
        disabled={addingCell}
        onClick={handleRemove}
        sx={{ width: '100%', borderRadius: 1 }}
      >
        <EggAltIcon sx={{ fontSize: 16 }} />
        <ClearIcon
          sx={{ position: 'absolute', fontSize: 10, marginBottom: '-1.5em', marginRight: '-2em' }}
        />
      </IconButton>
    </Tooltip>
  ) : (
    <IconButton onClick={handleReset} sx={{ width: '100%', borderRadius: 1 }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );
}

export default RemoveCellsButton;
