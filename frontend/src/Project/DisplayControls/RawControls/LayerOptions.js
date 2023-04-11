/** Modified from https://github.com/hms-dbmi/viv */
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { styled } from '@mui/system';
import { useSelector } from '@xstate/react';
import React, { useReducer, useRef } from 'react';
import ColorPalette from './ColorPalette';

const Span = styled('span')``;

function LayerOptions({ layer, toggleType }) {
  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);
  const index = useSelector(layer, (state) => state.context.layer);

  const handleColorSelect = (color) => {
    toggle();
    layer.send({ type: 'SET_COLOR', color });
  };

  const handleEdit = () => {
    toggle();
    toggleType();
  };

  return (
    <>
      <IconButton
        data-testid={`layer${index}-options`}
        aria-label='Remove channel'
        size='small'
        onClick={toggle}
        ref={anchorRef}
      >
        <MoreVertIcon />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <Paper sx={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id='channel-options'>
              <MenuItem dense disableGutters onClick={handleEdit}>
                <Span
                  sx={{
                    width: '70px',
                    textAlign: 'center',
                    px: '2px',
                    color: 'white',
                  }}
                >
                  Edit Name
                </Span>
              </MenuItem>
              <MenuItem
                dense
                disableGutters
                sx={{
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                  px: '2px',
                }}
              >
                <ColorPalette handleChange={handleColorSelect} />
              </MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

export default LayerOptions;
