import { Box, FormLabel } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import { useEditCellTypes } from '../../../ProjectContext';

function ToggleAll({ toggleArray, setToggleArray }) {
  const editCellTypes = useEditCellTypes();
  const theme = useTheme();
  const color = theme.palette.secondary.main;

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
    <Box display='flex'>
      <Checkbox
        color='secondary'
        sx={{ color: color }}
        checked={toggleArray.every((e, i) => e === true || i === 0)}
        onChange={handleCheck}
      />
      <FormLabel
        sx={{
          marginTop: 1.14,
          marginLeft: 0.75,
        }}
      >
        Toggle All
      </FormLabel>
    </Box>
  );
}

export default ToggleAll;
