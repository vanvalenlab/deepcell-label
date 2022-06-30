import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { Box, Button } from '@mui/material';
import React from 'react';
import { useReview } from '../ReviewContext';

function ReviewButtons() {
  const review = useReview();

  return (
    <Box sx={{ display: 'flex' }}>
      <Button
        sx={{ width: '50%', m: 1, ml: 0 }}
        variant='contained'
        color='primary'
        onClick={() => review.send('ACCEPT')}
      >
        Accept
        <ThumbUpIcon />
      </Button>
      <Button
        sx={{ width: '50%', m: 1, mr: 0 }}
        variant='contained'
        color='secondary'
        onClick={() => review.send('REJECT')}
      >
        Reject
        <ThumbDownIcon />
      </Button>
    </Box>
  );
}

export default ReviewButtons;
