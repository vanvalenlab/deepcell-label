import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
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
    <Tooltip title={toggleTooltip}>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={!grayscale}
              onChange={() => send('TOGGLE_COLOR_MODE')}
              inputRef={inputRef}
            />
          }
          label='Multi-channel'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
    // <Box
    //   component='label'
    //   // container
    //   display='flex'
    //   justifyContent='center'
    //   alignItems='center'
    // >
    //   <Grid item align='right' style={{ flex: '1 1 auto' }}>
    //     <Tooltip title='Shows a single channel'>
    //       <span>Multi-channel</span>
    //     </Tooltip>
    //   </Grid>
    //   <Tooltip title={toggleTooltip}>
    //     <Grid item style={{ flex: '0 1 auto' }}>
    //       <Switch
    //         // color="default"
    //         checked={!grayscale}
    //         onChange={() => send('TOGGLE_COLOR_MODE')}
    //         inputRef={inputRef}
    //         size='small'
    //       />
    //     </Grid>
    //   </Tooltip>
    // </Box>
  );
}

export default ColorModeToggle;
