import { FormLabel, Slider, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useEffect, useState } from 'react';
import { useImage } from '../ProjectContext';

function FrameSlider({ showLabel = true }) {
  const image = useImage();
  const frame = useSelector(image, (state) => state.context.frame);
  const numFrames = useSelector(image, (state) => state.context.numFrames);

  useEffect(() => {
    const prevFrame = Math.max(0, frame - 1);
    const nextFrame = Math.min(frame + 1, numFrames - 1);
    bind('a', () => image.send({ type: 'SET_FRAME', frame: prevFrame }));
    bind('d', () => image.send({ type: 'SET_FRAME', frame: nextFrame }));
    return () => {
      unbind('a');
      unbind('d');
    };
  }, [frame, image, numFrames]);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'SET_FRAME', frame: newValue });
    }
  };

  const tooltipText = (
    <span>
      Cycle with <kbd>A</kbd> and <kbd>D</kbd>.
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
        {showLabel && <FormLabel>Frame</FormLabel>}
        <Tooltip title={tooltipText}>
          <Slider
            value={frame}
            valueLabelDisplay={display}
            step={1}
            marks
            min={0}
            max={numFrames - 1}
            onChange={handleFrameChange}
            sx={{ p: 0 }}
          />
        </Tooltip>
      </>
    )
  );
}

export default FrameSlider;
