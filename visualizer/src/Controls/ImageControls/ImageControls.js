import { Box, Button, makeStyles, Slider } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import { green } from '@material-ui/core/colors';
import FormLabel from '@material-ui/core/FormLabel';
import Tooltip from '@material-ui/core/Tooltip';
import SendIcon from '@material-ui/icons/Send';
import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useApi, useImage, useLabeled, useRaw } from '../../ServiceContext';
import LabeledControls from './LabeledControls';
import RawControls from './RawControls/RawControls';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // width: '100%',
    padding: theme.spacing(1),
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

function SubmitButton() {
  const api = useApi();
  const { send } = api;
  const uploading = useSelector(api, state => state.matches('uploading'));

  const styles = useStyles();

  return (
    <Button
      variant='contained'
      color='primary'
      endIcon={<SendIcon />}
      onClick={() => send('UPLOAD')}
      disabled={uploading}
    >
      Submit
      {uploading && <CircularProgress className={styles.buttonProgress} />}
    </Button>
  );
}

export const FrameSlider = () => {
  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);
  const numFrames = useSelector(image, state => state.context.numFrames);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOAD_FRAME', frame: newValue });
    }
  };

  const tooltipText = (
    <span>
      Cycle with <kbd>A</kbd> and <kbd>D</kbd>.
    </span>
  );

  const styles = useStyles();

  const [display, setDisplay] = useState('on');

  // Display label for a second after the label changes
  useEffect(() => {
    setDisplay('on');
    const displayTimeout = setTimeout(() => setDisplay('auto'), 1000);
    return () => clearTimeout(displayTimeout);
  }, [frame]);

  return (
    numFrames > 1 && (
      <>
        {/* <Typography className={styles.title}>
      Frame
    </Typography> */}
        <FormLabel component='legend' className={styles.title}>
          Frame
        </FormLabel>
        <Tooltip title={tooltipText}>
          <Slider
            value={frame}
            valueLabelDisplay={display}
            step={1}
            marks
            min={0}
            max={numFrames - 1}
            onChange={handleFrameChange}
          />
        </Tooltip>
      </>
    )
  );
};

const ImageControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  const styles = useStyles();

  return (
    <Box id='image-controls' className={styles.root}>
      <SubmitButton />
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
