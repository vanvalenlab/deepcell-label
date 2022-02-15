/** Modified from https://github.com/hms-dbmi/viv */
import LensIcon from '@mui/icons-material/Lens';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/system';
import React from 'react';

const Div = styled('div')``;

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
    <Div
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
            sx={{ p: '3px', width: '16px', height: '16px' }}
            key={color}
            onClick={() => handleChange(color)}
            size='large'
          >
            <LensIcon fontSize='small' sx={{ width: '17px', height: '17px', color: color }} />
          </IconButton>
        );
      })}
    </Div>
  );
};

export default ColorPalette;
