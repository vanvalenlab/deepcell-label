import { Box, FormLabel } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { useCellTypes, useEditCellTypes } from '../../../ProjectContext';

function ToggleAll() {
  const editCellTypes = useEditCellTypes();
  const cellTypes = useCellTypes();
  const toggleArray = useSelector(cellTypes, (state) => state.context.isOn);

  const handleCheck = () => {
    if (toggleArray.every((e, i) => e === true || e === null || i === 0)) {
      editCellTypes.send({ type: 'UNTOGGLE_ALL' });
    } else {
      editCellTypes.send({ type: 'TOGGLE_ALL' });
    }
  };

  return (
    <Box display='flex' alignItems='center'>
      <Checkbox
        checked={toggleArray.every((e, i) => e === true || e === null || i === 0)}
        onChange={handleCheck}
      />
      <FormLabel sx={{ marginLeft: 0.75 }}>Toggle All</FormLabel>
    </Box>
  );
}

export default ToggleAll;
