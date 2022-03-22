import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useSpots } from '../../../ProjectContext';

function SpotOutlineToggle() {
  const spots = useSpots();
  const outline = useSelector(spots, (state) => state.context.outline);

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
            checked={outline}
            onChange={() => spots.send('TOGGLE_OUTLINE')}
            inputRef={inputRef}
          />
        }
        label='Outline'
        labelPlacement='start'
      />
    </FormGroup>
  );
}

export default SpotOutlineToggle;
