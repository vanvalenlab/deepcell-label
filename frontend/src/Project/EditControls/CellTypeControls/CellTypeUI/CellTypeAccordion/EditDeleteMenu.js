import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { useReducer, useRef } from 'react';
import { useEditCellTypes } from '../../../../ProjectContext';

const editStyle = {
  position: 'absolute',
  marginLeft: 30,
  marginTop: -0.5,
  color: 'gray',
  height: '42%',
};

function EditDeleteMenu(props) {
  const { toggleType, id } = props;
  const editCellTypesRef = useEditCellTypes();
  const anchorRef = useRef(null);
  const [openMenu, toggleMenu] = useReducer((v) => !v, false);

  // Handler for when a cell type is deleted
  const handleRemove = () => {
    editCellTypesRef.send({ type: 'REMOVE_TYPE', cellType: id });
  };

  // Handler for when the menu button is clicked
  const handleClickMenu = (e) => {
    e.stopPropagation();
    toggleMenu();
  };

  return (
    <IconButton
      onClick={handleClickMenu}
      id={'editDeleteMenu'}
      ref={anchorRef}
      style={{ borderRadius: 20 }}
      sx={editStyle}
    >
      <MoreVertIcon />
      <Popper open={openMenu} anchorEl={anchorRef.current} placement='bottom-start'>
        <Paper>
          <ClickAwayListener onClickAway={toggleMenu}>
            <MenuList id='edit-types'>
              <MenuItem onClick={toggleType}>Edit Name</MenuItem>
              <MenuItem onClick={handleRemove} sx={{ color: 'red' }}>
                Delete
              </MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </IconButton>
  );
}

export default EditDeleteMenu;
