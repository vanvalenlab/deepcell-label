import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useCallback, useEffect, useRef } from 'react';
import { useRaw } from '../../../ProjectContext';

function ColorModeToggle() {
  const raw = useRaw();
  const grayscale = useSelector(raw, state => state.context.isGrayscale);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = `${input.className}  mousetrap`;
  }, []);

  const onClick = useCallback(() => raw.send('TOGGLE_COLOR_MODE'), [raw]);

  useEffect(() => {
    bind('y', onClick);
    return () => unbind('y');
  }, [onClick]);

  const toggleTooltip = (
    <span>
      Toggle with <kbd>Y</kbd>
    </span>
  );

  return (
    <Tooltip title={toggleTooltip}>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={!grayscale}
              onChange={() => raw.send('TOGGLE_COLOR_MODE')}
              inputRef={inputRef}
            />
          }
          label='Multi-channel'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
  );
}

export default ColorModeToggle;
