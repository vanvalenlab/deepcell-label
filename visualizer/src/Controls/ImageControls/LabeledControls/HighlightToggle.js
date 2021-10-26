import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect, useRef } from 'react';
import { useLabeled } from '../../../ProjectContext';

function HighlightToggle() {
  const labeled = useLabeled();
  const highlight = useSelector(labeled, state => state.context.highlight);

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = `${input.className}  mousetrap`;
  }, []);

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
