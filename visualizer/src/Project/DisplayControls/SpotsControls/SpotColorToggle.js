import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useMousetrapRef, useSpots } from '../../ProjectContext';

function SpotColorToggle() {
  const spots = useSpots();
  const colorSpots = useSelector(spots, (state) => state.context.colorSpots);

  const inputRef = useMousetrapRef();

  return (
    <FormGroup row>
      <FormControlLabel
        control={
          <Switch
            size='small'
            checked={colorSpots}
            onChange={() => spots.send('TOGGLE_COLOR_SPOTS')}
            inputRef={inputRef}
          />
        }
        label='Color'
        labelPlacement='start'
      />
    </FormGroup>
  );
}

export default SpotColorToggle;
