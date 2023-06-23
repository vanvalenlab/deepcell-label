import { FormLabel, Grid, Switch, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useCanvas } from '../../../ProjectContext';

function ToggleAnimation() {
  const canvas = useCanvas();
  const enableAnimations = useSelector(canvas, (state) => state.context.enableAnimations);

  const handleCheck = useCallback(() => {
    canvas.send({ type: 'TOGGLE_ANIMATIONS' });
  }, [canvas]);

  useEffect(() => {
    bind('shift+a', handleCheck);
    return () => {
      unbind('shift+a', handleCheck);
    };
  }, [handleCheck]);

  return (
    <Grid item xs={6} display='flex' alignItems='center'>
      <FormLabel sx={{ marginLeft: 0.75 }}>Animations</FormLabel>
      <Tooltip
        title={
          <span>
            WARNING: Enables flashing animation for highlighted cells <br />
            <kbd>Shift</kbd> + <kbd>A</kbd>
          </span>
        }
        placement='bottom'
      >
        <Switch checked={enableAnimations} onChange={handleCheck} />
      </Tooltip>
    </Grid>
  );
}

export default ToggleAnimation;
