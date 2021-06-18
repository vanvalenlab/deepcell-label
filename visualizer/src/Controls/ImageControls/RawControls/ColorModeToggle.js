import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useImage, useRaw } from '../../../ServiceContext';

function ColorModeToggle() {
  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);
  const raw = useRaw();
  const { send } = raw;

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = input.className + ' mousetrap';
  }, []);

  return (
    <Typography component='div'>
      <Box
        component='label'
        // container
        display='flex'
        justifyContent='center'
        alignItems='center'
      >
        <Tooltip title='View multiple channels at once'>
          <Grid item align='right' style={{ flex: '1 1 auto' }}>
            Color
          </Grid>
        </Tooltip>
        <Tooltip title='Press Z to toggle.'>
          <Grid item style={{ flex: '0 1 auto' }}>
            <Switch
              // color="default"
              checked={grayscale}
              onChange={() => send('TOGGLE_COLOR_MODE')}
              inputRef={inputRef}
            />
          </Grid>
        </Tooltip>
        <Tooltip title='View a single channel'>
          <Grid item align='left' style={{ flex: '1 1 auto' }}>
            Grayscale
          </Grid>
        </Tooltip>
      </Box>
    </Typography>
  );
}

export default ColorModeToggle;
