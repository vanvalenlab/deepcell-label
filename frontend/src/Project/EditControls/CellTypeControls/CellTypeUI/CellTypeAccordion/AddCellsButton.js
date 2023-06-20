import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EggAltIcon from '@mui/icons-material/EggAlt';
import { IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../../../ProjectContext';

function AddCellsButton({ id, name }) {
  const editCellTypes = useEditCellTypes();
  const addingCell = useSelector(editCellTypes, (state) => state.matches('addingCell'));
  const removingCell = useSelector(editCellTypes, (state) => state.matches('removingCell'));

  // Handle logic for starting add mode
  const handleAdd = () => {
    if (addingCell || removingCell) {
      editCellTypes.send({ type: 'RESET' });
    } else {
      editCellTypes.send({ type: 'ADD_MODE', cellType: id, name: name });
    }
  };

  return !addingCell ? (
    <Tooltip title='Add Cells' enterDelay={500} enterNextDelay={500}>
      <IconButton
        disabled={removingCell}
        onClick={handleAdd}
        sx={{ width: '100%', borderRadius: 1 }}
      >
        <EggAltIcon sx={{ fontSize: 16 }} />
        <AddIcon
          sx={{ position: 'absolute', fontSize: 10, marginBottom: '-1.5em', marginRight: '-2em' }}
        />
      </IconButton>
    </Tooltip>
  ) : (
    <IconButton onClick={handleAdd} sx={{ width: '100%', borderRadius: 1 }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );
}

export default AddCellsButton;
