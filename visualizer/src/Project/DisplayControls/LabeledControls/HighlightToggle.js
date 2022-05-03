import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled, useMousetrapInputRef } from '../../ProjectContext';

function HighlightToggle() {
  const labeled = useLabeled();
  const highlight = useSelector(labeled, (state) => state.context.highlight);

  const inputRef = useMousetrapInputRef();

  const tooltipText = (
    <span>
      Toggle with <kbd>H</kbd>
    </span>
  );

  useEffect(() => {
    bind('h', () => labeled.send('TOGGLE_HIGHLIGHT'));
    // const sendToggleHighlight = e => {
    //   if (e.key === 'h') {
    //     labeled.send('TOGGLE_HIGHLIGHT');
    //   }
    // };
    // document.addEventListener('keydown', sendToggleHighlight);
    // return () => document.removeEventListener('keydown', sendToggleHighlight);
  }, [labeled]);

  return (
    <Tooltip title={tooltipText}>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={highlight}
              onChange={() => labeled.send('TOGGLE_HIGHLIGHT')}
              inputRef={inputRef}
            />
          }
          label='Highlight'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
  );
}

export default HighlightToggle;
