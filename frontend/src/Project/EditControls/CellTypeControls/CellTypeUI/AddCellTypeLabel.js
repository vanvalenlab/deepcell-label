import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Paper } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper from '@mui/material/Popper';
import { useReducer, useRef } from 'react';
import { CirclePicker } from 'react-color';
import { useEditCellTypes } from '../../../ProjectContext';
import { colors } from './ColorIndicator';

function AddCellTypeLabel(props) {
  const { toggleArray, setToggleArray } = props;
  const editCellTypesRef = useEditCellTypes();

  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const handleChange = (color) => {
    setToggleArray(toggleArray.concat([true]));
    editCellTypesRef.send({ type: 'ADD_TYPE', color: color.hex });
    toggle();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Button
        variant='contained'
        startIcon={
          <AddIcon
            sx={{
              position: 'relative',
              top: -0.3,
              left: -5,
            }}
          />
        }
        sx={{
          position: 'absolute',
          m: 1,
          my: 0.25,
          top: 0,
          margin: 'auto',
          height: '2.5rem',
          width: 300,
          fontWeight: 'bold',
          fontSize: 14,
        }}
        onClick={toggle}
        ref={anchorRef}
        size='large'
      >
        <div style={{ marginRight: 106 }}>Add Cell Type</div>
      </Button>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom'>
        <ClickAwayListener onClickAway={toggle}>
          <Paper sx={{ p: '1em' }}>
            <CirclePicker colors={colors} onChange={handleChange} />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}

export default AddCellTypeLabel;
