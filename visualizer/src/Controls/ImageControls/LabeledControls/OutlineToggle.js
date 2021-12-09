import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect, useRef } from 'react';
import { useLabeled } from '../../../ProjectContext';

function OutlineToggle() {
  const labeled = useLabeled();
  const outline = useSelector(labeled, (state) => state.context.outline);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = `${input.className}  mousetrap`;
  }, []);

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
