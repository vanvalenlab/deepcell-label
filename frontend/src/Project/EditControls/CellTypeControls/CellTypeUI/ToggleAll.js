import { Box, FormLabel } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useEditCellTypes } from '../../../ProjectContext';

function ToggleAll({ toggleArray, setToggleArray }) {
  const editCellTypes = useEditCellTypes();

  const handleCheck = () => {
    if (toggleArray.every((e, i) => e === true || i === 0)) {
      editCellTypes.send({ type: 'UNTOGGLE_ALL' });
      setToggleArray(toggleArray.map((t) => false));
    } else {
      editCellTypes.send({ type: 'TOGGLE_ALL' });
      setToggleArray(toggleArray.map((t) => true));
    }
  };

  return (
    <Box display='flex' alignItems='center'>
      <Checkbox
        checked={toggleArray.every((e, i) => e === true || i === 0)}
        onChange={handleCheck}
      />
      <FormLabel sx={{ marginLeft: 0.75 }}>Toggle All</FormLabel>
    </Box>
  );
}

export default ToggleAll;
