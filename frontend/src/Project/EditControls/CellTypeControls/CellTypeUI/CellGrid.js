import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, IconButton } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../../ProjectContext';

const buttonStyle = {
  borderRadius: 5,
  boxShadow: 1,
  marginTop: -2,
  marginBottom: 2,
  width: '100%',
};

const addButtonStyle = {
  borderRadius: 5,
  boxShadow: 1,
  marginTop: -2,
  marginBottom: 2,
  width: '95%',
};

const buttonBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  fontSize: 13,
};

function CellGrid(props) {
  const { id, name } = props;
  const editCellTypesRef = useEditCellTypes();
  const addingCell = useSelector(editCellTypesRef, (state) => state.matches('addingCell'));
  const removingCell = useSelector(editCellTypesRef, (state) => state.matches('removingCell'));

  // Handle logic for resetting add/remove or starting add mode
  const handleAdd = () => {
    if (addingCell || removingCell) {
      setTimeout(() => editCellTypesRef.send({ type: 'RESET' }), 100);
    } else {
      setTimeout(() => editCellTypesRef.send({ type: 'ADD', cellType: id, name: name }), 100);
    }
  };

  // Handle starting the remove mode
  const handleRemove = () => {
    setTimeout(() => editCellTypesRef.send({ type: 'REMOVE_MODE', cellType: id, name: name }), 100);
  };

  return (
    <Box display='grid' gridTemplateColumns='repeat(6, 1fr)' gap={1}>
      {!addingCell && !removingCell ? (
        <>
          <Box gridColumn='span 3'>
            <IconButton onClick={handleAdd} sx={addButtonStyle}>
              <Box sx={buttonBoxStyle}>
                <AddCircleOutlineIcon sx={{ marginRight: 0.5, fontSize: 18 }} />
                Add Cells
              </Box>
            </IconButton>
          </Box>
          <Box gridColumn='span 3'>
            <IconButton onClick={handleRemove} sx={buttonStyle}>
              <Box sx={buttonBoxStyle}>
                <RemoveCircleOutlineIcon sx={{ marginRight: 0.5, fontSize: 18 }} />
                Remove Cells
              </Box>
            </IconButton>
          </Box>
        </>
      ) : (
        <Box gridColumn='span 6'>
          <IconButton onClick={handleAdd} sx={buttonStyle}>
            <Box sx={buttonBoxStyle}>
              <CheckCircleOutlineIcon sx={{ marginLeft: -1, marginRight: 0.5, fontSize: 18 }} />
              Done
            </Box>
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

export default CellGrid;
