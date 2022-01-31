import { FormLabel, Slider, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect, useState } from 'react';
import { useImage } from '../../ProjectContext';

function FrameSlider() {
  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);
  const numFrames = useSelector(image, (state) => state.context.numFrames);

  useEffect(() => {
    const prevFrame = (frame - 1 + numFrames) % numFrames;
    const nextFrame = (frame + 1) % numFrames;
    bind('a', () => image.send({ type: 'LOAD_FRAME', frame: prevFrame }));
    bind('d', () => image.send({ type: 'LOAD_FRAME', frame: nextFrame }));
  }, [frame, image, numFrames]);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOAD_FRAME', frame: newValue });
    }
  };

  const tooltipText = (
    <span>
      Cycle with <kbd>A</kbd> and <kbd>D</kbd>
    </span>
  );

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
        <FormLabel component='legend' sx={{ paddingTop: 1, paddingBottom: 1 }}>
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
}

export default FrameSlider;
