import CreateNewFolderTwoToneIcon from '@mui/icons-material/CreateNewFolderTwoTone';
import { IconButton, Paper, Tooltip } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper from '@mui/material/Popper';
import { useReducer, useRef } from 'react';
import { CirclePicker } from 'react-color';
import { useEditCellTypes } from '../../../../ProjectContext';
import { colors } from '../CellTypeAccordion/ColorIndicator';

function AddCellTypeLabel() {
  const editCellTypesRef = useEditCellTypes();

  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const handleChange = (color) => {
    editCellTypesRef.send({ type: 'ADD_TYPE', color: color.hex });
    toggle();
  };

  return (
    <>
      <Tooltip title='Add New Cell Type' placement='top'>
        <IconButton
          ref={anchorRef}
          color='primary'
          sx={{ width: '100%', borderRadius: 1 }}
          onClick={toggle}
        >
          <CreateNewFolderTwoToneIcon />
        </IconButton>
      </Tooltip>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <ClickAwayListener onClickAway={toggle}>
          <Paper sx={{ p: '1em' }}>
            <CirclePicker colors={colors} onChange={handleChange} />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

export default AddCellTypeLabel;
