import { Slider, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useEffect, useState } from 'react';
import { useImage, useMousetrapRef } from '../../ProjectContext';

function TimeSlider() {
  const image = useImage();
  const t = useSelector(image, (state) => state.context.t);
  const duration = useSelector(image, (state) => state.context.duration);

  const inputRef = useMousetrapRef();

  useEffect(() => {
    const prevT = Math.max(0, t - 1);
    const nextT = Math.min(t + 1, duration - 1);
    bind('a', () => image.send({ type: 'SET_T', t: prevT }));
    bind('d', () => image.send({ type: 'SET_T', t: nextT }));
    return () => {
      unbind('a');
      unbind('d');
    };
  }, [t, image, duration]);

  const handleChange = (event, newValue) => {
    if (newValue !== t) {
      image.send({ type: 'SET_T', t: newValue });
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
  }, [t]);

  return (
    <Tooltip title={tooltipText} placement='top'>
      <Slider
        value={t}
        valueLabelDisplay={display}
        step={1}
        marks
        min={0}
        max={duration - 1}
        onChange={handleChange}
        sx={{ p: 0, zIndex: 1 }}
        componentsProps={{ input: { ref: inputRef } }}
      />
    </Tooltip>
  );
}

export default TimeSlider;
