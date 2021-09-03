import { makeStyles, Slider, Tooltip } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import { useImage } from '../../ProjectContext';

const useStyles = makeStyles(theme => ({
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

function FrameSlider() {
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
    )
  );
}

export default FrameSlider;
