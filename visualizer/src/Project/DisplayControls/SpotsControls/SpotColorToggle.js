import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useSpots } from '../../ProjectContext';

function SpotColorToggle() {
  const spots = useSpots();
  const colorSpots = useSelector(spots, (state) => state.context.colorSpots);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = `${input.className} mousetrap`;
  }, []);

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
