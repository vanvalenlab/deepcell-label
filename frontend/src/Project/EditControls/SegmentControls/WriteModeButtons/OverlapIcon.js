import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import React from 'react';

function OverlapIcon() {
  return (
    <>
      <CircleTwoToneIcon sx={{ position: 'absolute', left: '50%', zIndex: -1, color: 'gray' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', zIndex: 0, color: 'black' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', right: '50%', zIndex: -1, color: 'gray' }} />
    </>
  );
}

export default OverlapIcon;
