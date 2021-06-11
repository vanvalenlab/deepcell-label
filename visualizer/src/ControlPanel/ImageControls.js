import React, { useState, useEffect } from 'react';
import { useSelector } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import { Box, Button, makeStyles } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import { Slider } from "@material-ui/core";
import Typography from '@material-ui/core/Typography';

import { useImage, useRaw, useLabeled } from '../ServiceContext';

import RawControls from './RawControls/RawControls';
import LabeledController from './LabeledController';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // width: '100%',
    padding: theme.spacing(1),
  },
  title: {
    paddingTop: theme.spacing(2),
  }
}));

function SubmitButton() {

  return (
    <Button 
      variant='contained' 
      color='primary' 
      endIcon={<SendIcon />}
    >
      Submit
    </Button>
  );
}

export const FrameSlider = () => {
  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);
  const numFrames = useSelector(image, state => state.context.numFrames);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOADFRAME', frame: newValue });
    }
  };

  const tooltipText = <span>Cycle with <kbd>A</kbd> and <kbd>D</kbd>.</span>;

  const styles = useStyles();

  const [display, setDisplay] = useState("on");

  // Display label for a second after the label changes
  useEffect(() => {
    setDisplay("on");
    const displayTimeout = setTimeout(() => setDisplay("auto"), 1000);
    return () => clearTimeout(displayTimeout);
  }, [frame]);

  return numFrames > 1 && <>
    <Typography className={styles.title}>
      Frame
    </Typography>
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
  </>;
};

const ImageControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  const styles = useStyles();

  return (
    <Box id='image-controls' className={styles.root}>
      <SubmitButton />
      <FrameSlider />
      {labeled && <LabeledController />}
      {raw && <RawControls />}
    </Box>
  );
};

// {/* <TableRow className={styles.row}> */}
// {/* <TableCell className={styles.cell}> */}
// </TableCell>
// </TableRow>

export default ImageControls;
