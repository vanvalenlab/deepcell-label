import { Tooltip } from '@mui/material';
import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import React, { useEffect } from 'react';
import { useLabeled, useMousetrapRef } from '../../ProjectContext';

let numMounted = 0;

function OutlineOpacitySlider() {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.outlineOpacity);

  const inputRef = useMousetrapRef();

  const handleChange = (event, newValue) =>
    labeled.send({ type: 'SET_OUTLINE_OPACITY', opacity: newValue });

  const handleDoubleClick = () => labeled.send({ type: 'SET_OUTLINE_OPACITY', opacity: 0.3 }); // [0.3, 1] for range slider

  useEffect(() => {
    const listener = (e) => {
      if (e.key === 'o') {
        labeled.send('CYCLE_OUTLINE_OPACITY');
      }
    };
    if (numMounted === 0) {
      document.addEventListener('keydown', listener);
    }
    numMounted++;
    return () => {
      numMounted--;
      if (numMounted === 0) {
        document.removeEventListener('keydown', listener);
      }
    };
  }, [labeled]);

  // const tooltipText = (
  //   <span>
  //     Low sets opacity for all outlines
  //     <br />
  //     High sets opacity for selected outline
  //   </span>
  // );

  return (
    // <Tooltip title={tooltipText}>
    <Tooltip title={<kbd>O</kbd>} placement='right'>
      <Slider
        value={opacity}
        min={0}
        max={1}
        // track={false}
        step={0.01}
        size='small'
        onChange={handleChange}
        onDoubleClick={handleDoubleClick}
        componentsProps={{ input: { ref: inputRef } }}
        sx={{ py: 0, '& .MuiSlider-thumb': { height: 15, width: 15 } }}
      />
    </Tooltip>
    // </Tooltip>
  );
}

export default OutlineOpacitySlider;
