import { Box, makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import React from 'react';
import { useLabeled, useRaw } from '../../ServiceContext';
import CheckButton from './CheckButton';
import FrameSlider from './FrameSlider';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';
import SubmitButton from './SubmitButton';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // width: '100%',
    padding: theme.spacing(1),
  },
  buttons: {
    display: 'flex',
    width: '100%',
  },
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  buttonProgress: {
    color: green[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
}));

const ImageControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  const styles = useStyles();

  return (
    <Box id='image-controls' className={styles.root}>
      <Box className={styles.buttons}>
        <SubmitButton />
        <CheckButton />
      </Box>
      <FrameSlider />
      {labeled && <LabeledControls />}
      {raw && <RawControls />}
    </Box>
  );
};

// {/* <TableRow className={styles.row}> */}
// {/* <TableCell className={styles.cell}> */}
// </TableCell>
// </TableRow>

export default ImageControls;
