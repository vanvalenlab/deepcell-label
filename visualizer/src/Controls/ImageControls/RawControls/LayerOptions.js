/** Modified from https://github.com/hms-dbmi/viv */
import ClickAwayListener from '@mui/material/ClickAwayListener';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import makeStyles from '@mui/styles/makeStyles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useSelector } from '@xstate/react';
import React, { useReducer, useRef } from 'react';
import { useRaw } from '../../../ProjectContext';
import ColorPalette from './ColorPalette';

const useStyles = makeStyles(() => ({
  paper: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  span: {
    width: '70px',
    textAlign: 'center',
    paddingLeft: '2px',
    paddingRight: '2px',
    color: 'white',
  },
  colors: {
    '&:hover': {
      backgroundColor: 'transparent',
    },
    paddingLeft: '2px',
    paddingRight: '2px',
  },
}));

function LayerOptions({ layer }) {
  const [open, toggle] = useReducer((v) => !v, false);
  const anchorRef = useRef(null);

  const raw = useRaw();
  const colorMode = useSelector(raw, (state) => state.context.colorMode);

  const handleColorSelect = (color) => {
    layer.send({ type: 'SET_COLOR', color });
  };

  const handleRemove = () => {
    toggle();
    colorMode.send({ type: 'REMOVE_LAYER', layer });
  };

  const classes = useStyles();
  return (
    <>
      <IconButton aria-label='Remove channel' size='small' onClick={toggle} ref={anchorRef}>
        <MoreVertIcon fontSize='small' />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <Paper className={classes.paper}>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id='channel-options'>
              <MenuItem dense disableGutters onClick={handleRemove}>
                <span className={classes.span}>Remove</span>
              </MenuItem>
              <MenuItem dense disableGutters className={classes.colors}>
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
