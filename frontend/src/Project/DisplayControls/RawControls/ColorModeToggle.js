import { FormLabel, Switch } from '@mui/material';
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

  return (
    <Tooltip title={<kbd>Y</kbd>} placement='right'>
      <>
        <FormLabel>Color</FormLabel>
        <Switch
          size='small'
          checked={!grayscale}
          onChange={() => raw.send('TOGGLE_COLOR_MODE')}
          inputRef={inputRef}
        />
      </>
    </Tooltip>
  );
}

export default ColorModeToggle;
