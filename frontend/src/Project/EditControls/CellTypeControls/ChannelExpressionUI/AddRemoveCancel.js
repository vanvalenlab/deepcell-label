import CircleIcon from '@mui/icons-material/Circle';
import { Button, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes, useEditCellTypes, useLabeled } from '../../../ProjectContext';
import { getColorFromId } from '../CellInfoUI/AddCellTypeChip';

export function getName(cellTypes, id) {
  const type = cellTypes.find((cellType) => cellType.id === id);
  return type.name;
}

function AddRemoveCancel() {
  const cellTypes = useCellTypes();
  const editCellTypes = useEditCellTypes();
  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);
  const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes).filter(
    (cellType) => cellType.feature === feature
  );
  const selection = useSelector(editCellTypes, (state) => state.context.multiSelected);
  const selecting = selection.length === 0 ? false : true;
  const [cellType, setCellType] = useState(0);
  const cellTypeIds = cellTypesList.map((cellType) => cellType.id);

  const handleCellType = (evt) => {
    setCellType(evt.target.value);
  };

  const handleCancel = () => {
    editCellTypes.send({ type: 'MULTISELECTION', selected: [] });
  };

  const addCellTypes = () => {
    editCellTypes.send({ type: 'MULTIADD', cellType: cellTypeIds[cellType] });
  };

  const removeCellTypes = () => {
    editCellTypes.send({ type: 'MULTIREMOVE', cellType: cellTypeIds[cellType] });
  };

  return cellTypeIds.length > 0 ? (
    <>
      <Grid item>
        <TextField
          select
          size='small'
          value={cellType}
          onChange={handleCellType}
          sx={{ width: '97%' }}
        >
          {cellTypeIds.map((opt, index) => (
            <MenuItem key={index} value={index}>
              <CircleIcon
                sx={{
                  fontSize: 12,
                  color: getColorFromId(cellTypesList, opt),
                  marginLeft: '0rem',
                  marginRight: '1rem',
                }}
              />
              {getName(cellTypesList, opt)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item sx={{ marginBottom: 1 }}>
        <Button
          sx={{ width: '31%' }}
          disabled={!selecting}
          variant='contained'
          onClick={addCellTypes}
        >
          Add
        </Button>
        <Button
          sx={{
            marginLeft: '2%',
            width: '31%',
            backgroundColor: 'rgba(244,67,54,1)',
            '&:hover': { backgroundColor: 'rgba(224,47,34,1)' },
          }}
          disabled={!selecting}
          variant='contained'
          onClick={removeCellTypes}
        >
          Remove
        </Button>
        <Button
          sx={{
            marginLeft: '2%',
            width: '31%',
            backgroundColor: 'rgba(0,0,0,0.1)',
            color: 'rgba(0,0,0,0.65)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.2)' },
          }}
          disabled={!selecting}
          variant='contained'
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </Grid>
    </>
  ) : null;
}

export default AddRemoveCancel;
