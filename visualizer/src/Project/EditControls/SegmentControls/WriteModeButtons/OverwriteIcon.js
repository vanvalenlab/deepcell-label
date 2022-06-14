import CircleIcon from '@mui/icons-material/Circle';
import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import React from 'react';

function OverwriteIcon() {
  return (
    <>
      <CircleTwoToneIcon sx={{ position: 'absolute', left: 22, zIndex: -1, color: 'gray' }} />
      <CircleIcon sx={{ position: 'absolute', zIndex: 0, color: 'white' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', zIndex: 1, color: 'black' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', right: 22, zIndex: -1, color: 'gray' }} />
    </>
  );
}

export default OverwriteIcon;
