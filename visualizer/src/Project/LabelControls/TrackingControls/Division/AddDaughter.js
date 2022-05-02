import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, IconButton } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import React, { useReducer, useRef } from 'react';
import { ArcherElement } from 'react-archer';
import { useEditLineage } from '../../../ProjectContext';

function AddDaughter({ label }) {
  const editLineage = useEditLineage();

  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const handleAddDaughter = () => {
    editLineage.send({ type: 'ADD_DAUGHTER', parent: label });
    toggle();
  };
  const handleNewCell = () => {
    editLineage.send({ type: 'CREATE_NEW_CELL', label });
    toggle();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ArcherElement id='addDaughter'>
        {/* point to hidden Avatar to align arrows */}
        <Avatar sx={{ m: 1, height: '2.5rem', width: '2.5rem', visibility: 'hidden' }} />
      </ArcherElement>
      <IconButton
        sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}
        onClick={toggle}
        ref={anchorRef}
        size='large'
      >
        <AddCircleOutlineIcon />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <Paper>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id='add-daughter-menu'>
              <MenuItem onClick={handleAddDaughter}>Add Daughter</MenuItem>
              <MenuItem onClick={handleNewCell}>Create New Cell</MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </Box>
  );
}

export default AddDaughter;
