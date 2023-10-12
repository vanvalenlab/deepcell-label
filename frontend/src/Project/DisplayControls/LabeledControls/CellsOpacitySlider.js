import { Tooltip } from '@mui/material';
import Slider from '@mui/material/Slider';
// import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import React, { useEffect } from 'react';
import { useLabeled, useMousetrapRef, useLabelMode } from '../../ProjectContext';

let numMounted = 0;

function CellsOpacitySlider() {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.cellsOpacity);

  const inputRef = useMousetrapRef();

  const handleChange = (event, newValue) =>
    labeled.send({ type: 'SET_CELLS_OPACITY', opacity: newValue });

  const handleDoubleClick = () => labeled.send({ type: 'SET_CELLS_OPACITY', opacity: 0.3 }); // [0.3, 1] for range slider

  const labelMode = useLabelMode();
  const isCellTypes = useSelector(labelMode, (state) => state.matches('editCellTypes'));

  useEffect(() => {
    const listener = (e) => {
      if (e.key === 'z') {
        labeled.send('CYCLE_CELLS_OPACITY');
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
  //     Low sets opacity for all cells
  //     <br />
  //     High sets opacity for selected cell
  //   </span>
  // );

  return (
    <Tooltip title={<kbd>Z</kbd>} placement='right'>
      <Slider
        value={isCellTypes ? 0 : opacity}
        min={0}
        max={1}
        // track={false}
        step={0.01}
        size='small'
        onChange={handleChange}
        onDoubleClick={handleDoubleClick}
        componentsProps={{ input: { ref: inputRef } }}
        sx={{ py: 0, '& .MuiSlider-thumb': { height: 15, width: 15 } }}
        disabled={isCellTypes}
      />
    </Tooltip>
  );
}

export default CellsOpacitySlider;
