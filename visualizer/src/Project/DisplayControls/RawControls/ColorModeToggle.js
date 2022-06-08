import { FormGroup } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useMousetrapRef, useRaw } from '../../ProjectContext';

function ColorModeToggle() {
  const raw = useRaw();
  const grayscale = useSelector(raw, (state) => state.context.isGrayscale);

  const inputRef = useMousetrapRef();

  const onClick = useCallback(() => raw.send('TOGGLE_COLOR_MODE'), [raw]);

  useEffect(() => {
    bind('y', onClick);
  }, [onClick]);

  const toggleTooltip = (
    <span>
      Toggle with <kbd>Y</kbd>
    </span>
  );

  return (
    <Tooltip title={toggleTooltip} placement='right'>
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
