import AddIcon from '@mui/icons-material/Add';
import { Box, Chip, MenuItem, Select } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes, useEditCellTypes, useSelectedCell } from '../../../ProjectContext';
import { getName } from '../ChannelExpressionUI/AddRemoveCancel';

function AddCellTypeChip() {
  const cellTypes = useCellTypes();
  const editCellTypes = useEditCellTypes();
  const selected = useSelectedCell();
  const feature = useSelector(cellTypes, (state) => state.context.feature);
  const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes).filter(
    (cellType) => cellType.feature === feature
  );
  const cellTypeIds = cellTypesList.map((cellType) => cellType.id);
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };

  // Add the selected cell to the cell type user clicks on
  const handleChange = (evt) => {
    const cellType = cellTypeIds[evt.target.value];
    editCellTypes.send({ type: 'ADD_LABEL', cell: selected, cellType: cellType });
    setOpen(false);
  };

  return (
    <Box>
      <Chip
        variant='outlined'
        label='ADD LABEL'
        size='small'
        icon={<AddIcon />}
        onClick={handleOpen}
        sx={{
          borderStyle: 'dashed',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#737373',
          '&:hover': {
            borderStyle: 'solid',
          },
        }}
      />
      <Select
        value={''} // Workaround since we need a value
        open={open}
        onChange={handleChange}
        onOpen={handleOpen}
        onClose={() => setOpen(false)}
        // Hide the select form, just want the menu selection
        sx={{
          opacity: 0,
          zIndex: -1000,
          height: 0,
          width: 0,
          p: -5,
          position: 'relative',
          right: '4.4rem',
        }}
      >
        {cellTypeIds.map((id, index) => (
          <MenuItem value={index} key={index}>
            {getName(cellTypesList, id)}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default AddCellTypeChip;
