import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import React, { useReducer, useRef } from 'react';
import { useEditDivisions } from '../../../ProjectContext';

function DaughterMenu({ daughter }) {
  const editDivisions = useEditDivisions();

  const [open, toggleOpen] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const handleRemove = () => {
    editDivisions.send({ type: 'REMOVE', daughter: daughter });
    toggleOpen();
  };

  return (
    <>
      <IconButton aria-label='Edit daughter' size='small' onClick={toggleOpen} ref={anchorRef}>
        <CloseIcon fontSize='small' />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <Paper>
          <ClickAwayListener onClickAway={toggleOpen}>
            <MenuList id='remove-daughter-menu'>
              <MenuItem onClick={handleRemove}>Remove from Division</MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

export default DaughterMenu;
