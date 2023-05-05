import ColorizeIcon from '@mui/icons-material/Colorize';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import { Box, IconButton, Paper } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper from '@mui/material/Popper';
import { useRef, useState } from 'react';
import { CirclePicker } from 'react-color';
import { useEditCellTypes } from '../../../../ProjectContext';

const colorStyle = {
  position: 'absolute',
  marginTop: '-0.4em',
  marginLeft: '-0.6em',
  marginBottom: '-0.6em',
};

export const colors = [
  '#fe29e2',
  '#f82387',
  '#e13219',
  '#fd9cba',
  '#fd8f20',
  '#fbd127',
  '#82400f',
  '#b18b34',
  '#f2cf9c',
  '#c0f442',
  '#a0e3b7',
  '#6a9c75',
  '#73ae22',
  '#195036',
  '#2af464',
  '#24fecd',
  '#58b5e1',
  '#8a96f7',
  '#333a9e',
  '#501bbf',
  '#9900EF',
  '#bd58db',
  '#8a0458',
  '#75435b',
];

function ColorIndicator(props) {
  const { id, color, openColor, toggleColor } = props;

  const editCellTypesRef = useEditCellTypes();
  const anchorRef = useRef(null);
  const [editIcon, setEditIcon] = useState(0);

  // Handler for when the color box is clicked
  const handleClickColor = (e) => {
    e.stopPropagation();
    toggleColor();
  };

  // Handler for when the color is changed
  const handleColor = (color, event) => {
    event.stopPropagation();
    editCellTypesRef.send({ type: 'COLOR', cellType: id, color: color.hex });
    toggleColor();
  };

  return (
    <Box style={colorStyle}>
      <IconButton
        onClick={handleClickColor}
        ref={anchorRef}
        onMouseEnter={() => setEditIcon(100)}
        onMouseLeave={() => setEditIcon(0)}
        size='large'
      >
        <SquareRoundedIcon
          sx={{
            position: 'absolute',
            fontSize: 35,
            color: color,
          }}
        />
        <ColorizeIcon
          sx={{
            position: 'relative',
            color: 'white',
            fontSize: 20,
            opacity: editIcon,
          }}
        />
      </IconButton>
      <Popper open={openColor} anchorEl={anchorRef.current} placement='bottom-start'>
        <ClickAwayListener onClickAway={toggleColor}>
          <Paper sx={{ p: '1em' }}>
            <CirclePicker color={color} colors={colors} onChange={handleColor} />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}

export default ColorIndicator;
