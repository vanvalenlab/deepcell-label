import CircleIcon from '@mui/icons-material/Circle';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import React from 'react';

function ExcludeIcon() {
  return (
    <>
      <CircleTwoToneIcon sx={{ position: 'absolute', right: '50%', zIndex: 1, color: 'gray' }} />
      <CircleIcon sx={{ position: 'absolute', right: '50%', zIndex: 0, color: 'white' }} />
      <CircleOutlinedIcon
        sx={{
          position: 'absolute',
          right: '50%',
          zIndex: 2,
          color: 'black',
          WebkitClipPath: 'circle(40% at 24px)',
        }}
      />
      <CircleTwoToneIcon sx={{ position: 'absolute', zIndex: -1, color: 'black' }} />
      <CircleTwoToneIcon sx={{ position: 'absolute', left: '50%', zIndex: 1, color: 'gray' }} />
      <CircleIcon sx={{ position: 'absolute', left: '50%', zIndex: 0, color: 'white' }} />
      <CircleOutlinedIcon
        sx={{
          position: 'absolute',
          left: '50%',
          zIndex: 2,
          color: 'black',
          WebkitClipPath: 'circle(40% at 24px)',
          transform: 'rotate(180deg)',
        }}
      />
    </>
  );
}

export default ExcludeIcon;
