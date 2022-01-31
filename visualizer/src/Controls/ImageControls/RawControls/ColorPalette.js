/** Modified from https://github.com/hms-dbmi/viv */
import LensIcon from '@mui/icons-material/Lens';
import IconButton from '@mui/material/IconButton';
import React from 'react';

// TODO: move to constants
const COLOR_PALLETE = [
  '#0000FF',
  '#00FF00',
  '#FF00FF',
  '#FFFF00',
  '#FF8000',
  '#00FFFF',
  '#FFFFFF',
  '#FF0000',
];

const ColorPalette = ({ handleChange }) => {
  return (
    <div
      sx={{
        width: '70px',
        height: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      aria-label='color-swatch'
    >
      {COLOR_PALLETE.map((color) => {
        return (
          <IconButton
            sx={{ padding: '3px', width: '16px', height: '16px' }}
            key={color}
            onClick={() => handleChange(color)}
            size='large'
          >
            <LensIcon
              fontSize='small'
              style={{ color: `${color}` }}
              sx={{ width: '17px', height: '17px' }}
            />
          </IconButton>
        );
      })}
    </div>
  );
};

export default ColorPalette;
