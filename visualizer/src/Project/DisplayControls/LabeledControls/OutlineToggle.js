import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled, useMousetrapRef } from '../../ProjectContext';

function OutlineToggle() {
  const labeled = useLabeled();
  const outline = useSelector(labeled, (state) => state.context.outline);

  const inputRef = useMousetrapRef();

  const tooltipText = (
    <span>
      Toggle with <kbd>O</kbd>
    </span>
  );

  useEffect(() => {
    bind('o', () => labeled.send('TOGGLE_OUTLINE'));
  }, [labeled]);

  return (
    <Tooltip title={tooltipText}>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={outline}
              onChange={() => labeled.send('TOGGLE_OUTLINE')}
              inputRef={inputRef}
            />
          }
          label='Outline'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
  );
}

export default OutlineToggle;
