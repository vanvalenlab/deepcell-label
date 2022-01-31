import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { Box, Button } from '@mui/material';
import React from 'react';
import { useQualityControl } from '../../QualityControlContext';

function ReviewButtons() {
  const qualityControl = useQualityControl();

  return (
    <Box sx={{ display: 'flex' }}>
      <Button
        sx={{ width: '50%', margin: 1 }}
        variant='contained'
        color='primary'
        onClick={() => qualityControl.send('ACCEPT')}
        style={{ marginLeft: 0 }}
      >
        Accept
        <ThumbUpIcon />
      </Button>
      <Button
        sx={{ width: '50%', margin: 1 }}
        variant='contained'
        color='secondary'
        onClick={() => qualityControl.send('REJECT')}
        style={{ marginRight: 0 }}
      >
        Reject
        <ThumbDownIcon />
      </Button>
    </Box>
  );
}

export default ReviewButtons;
