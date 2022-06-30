import { Checkbox } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled, useMousetrapRef } from '../../ProjectContext';

function HighlightToggle() {
  const labeled = useLabeled();
  const highlight = useSelector(labeled, (state) => state.context.highlight);

  const inputRef = useMousetrapRef();

  useEffect(() => {
    bind('h', () => labeled.send('TOGGLE_HIGHLIGHT'));
  }, [labeled]);

  return (
    <Tooltip title={<kbd>H</kbd>} placement='right'>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              size='small'
              checked={highlight}
              onChange={() => labeled.send('TOGGLE_HIGHLIGHT')}
              inputRef={inputRef}
              sx={{ py: 0 }}
            />
          }
          label='Highlight'
          labelPlacement='end'
        />
      </FormGroup>
    </Tooltip>
  );
}

export default HighlightToggle;
