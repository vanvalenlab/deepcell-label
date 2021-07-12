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
    input.className = `${input.className}  mousetrap`;
  }, []);

  const toggleTooltip = (
    <span>
      Toggle with <kbd>Y</kbd>
    </span>
  );

  return (
    <Typography component='div'>
      <Box
        component='label'
        // container
        display='flex'
        justifyContent='center'
        alignItems='center'
      >
        <Grid item align='right' style={{ flex: '1 1 auto' }}>
          <Tooltip title='Shows multiple channels'>
            <span>Color</span>
          </Tooltip>
        </Grid>
        <Tooltip title={toggleTooltip}>
          <Grid item style={{ flex: '0 1 auto' }}>
            <Switch
              // color="default"
              checked={grayscale}
              onChange={() => send('TOGGLE_COLOR_MODE')}
              inputRef={inputRef}
            />
          </Grid>
        </Tooltip>
        <Grid item align='left' style={{ flex: '1 1 auto' }}>
          <Tooltip title='Shows a single channel'>
            <span>Grayscale</span>
          </Tooltip>
        </Grid>
      </Box>
    </Typography>
  );
}

export default ColorModeToggle;
