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
import { useEditDivisions } from '../../../ProjectContext';

function AddDaughter({ division }) {
  const { parent } = division;
  const editDivisions = useEditDivisions();

  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const handleAddDaughter = () => {
    editDivisions.send({ type: 'ADD', parent: parent });
    toggle();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ArcherElement id='addDaughter'>
        {/* point to hidden Cell to align arrows and size button */}
        <Avatar sx={{ m: 1, my: 0.25, height: '2.5rem', width: '2.5rem', visibility: 'hidden' }} />
      </ArcherElement>
      <IconButton
        sx={{
          position: 'absolute',
          m: 1,
          my: 0.25,
          top: 0,
          left: 0,
          height: '2.5rem',
          width: '2.5rem',
        }}
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
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </Box>
  );
}

export default AddDaughter;
