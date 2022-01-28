import { Box, Button } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import React from 'react';
import { useQualityControl } from '../../QualityControlContext';

const useStyles = makeStyles((theme) => ({
  box: {
    display: 'flex',
  },
  button: {
    width: '50%',
    margin: theme.spacing(1),
  },
}));

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
        style={{ marginLeft: 0 }}
      >
        Accept
        <ThumbUpIcon />
      </Button>
      <Button
        className={styles.button}
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
