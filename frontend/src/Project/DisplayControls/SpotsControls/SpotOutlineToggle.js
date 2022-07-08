import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useMousetrapRef, useSpots } from '../../ProjectContext';

function SpotOutlineToggle() {
  const spots = useSpots();
  const outline = useSelector(spots, (state) => state.context.outline);

  const inputRef = useMousetrapRef();

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
        sx={{ m: 0 }}
      />
    </FormGroup>
  );
}

export default SpotOutlineToggle;
