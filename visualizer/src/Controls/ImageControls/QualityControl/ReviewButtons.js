import { Box, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ThumbDownIcon from '@material-ui/icons/ThumbDown';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import React from 'react';
import { useQualityControl } from '../../../QualityControl';

const useStyles = makeStyles({
  box: {
    display: 'flex',
  },
  button: {
    width: '50%',
  },
});

function ReviewButtons() {
  const styles = useStyles();
  const qualityControl = useQualityControl();

  return (
    <Box className={styles.box}>
      <Button
        className={styles.button}
        variant='contained'
        color='primary'
        onClick={() => qualityControl.send('ACCEPT')}
      >
        Accept
        <ThumbUpIcon />
      </Button>
      <Button
        className={styles.button}
        variant='contained'
        color='secondary'
        onClick={() => qualityControl.send('REJECT')}
      >
        Reject
        <ThumbDownIcon />
      </Button>
    </Box>
  );
}

export default ReviewButtons;
