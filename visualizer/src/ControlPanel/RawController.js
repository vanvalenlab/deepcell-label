import React from 'react';
import { useSelector, useActor } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import FormLabel from '@material-ui/core/FormLabel';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';

import { useRaw, useImage } from '../ServiceContext';
import LayerController from './LayerController';

const ColorModeToggle = () => {
  const image = useImage();
  const [current, send] = useActor(image);

  return (
    <Typography component="div">
        <Grid component="label" container alignItems="center" spacing={1}>
          <Grid item align="right">Color <br /> (multi-channel)</Grid>
          <Grid item>
            <Switch 
              color="default" 
              checked={current.matches('color.grayscale')} 
              onChange={() => send('TOGGLE_COLOR')} 
            />
          </Grid>
          <Grid item>Grayscale <br /> (one channel)</Grid>
        </Grid>
      </Typography>
  );
};

const RGBChannelController = () => {
  const raw = useRaw();
  const layers = useSelector(raw, state => state.context.layers);
  
  return <>
  {layers.map(
      (layer, index) =>
        <Grid
          // key={`channel-controller-${name}-${id}`}
          style={{ width: '100%' }}
          item
        >
          <LayerController layer={layer} />
        </Grid>
    )}
    <Button
      onClick={() => raw.send('ADD_LAYER')}
      fullWidth
      variant="outlined"
      style={{ borderStyle: 'dashed' }}
      startIcon={<AddIcon />}
      size="medium"
    >
      Add Channel
    </Button>
  </>;
}

const GrayscaleChannelController = () => {
  const raw = useRaw();
  const layer = useSelector(raw, state => state.context.layers[0]);
  
  return <Grid style={{ width: '100%' }} item >
    <LayerController layer={layer} />
  </Grid>;
}

export const RawController = () => {
  const image = useImage();
  const [current] = useActor(image);

  return <>
    <Box display='flex' flexDirection='row' justifyContent='space-between'>
      <FormLabel component="legend">
        Channel Controls
      </FormLabel>
      <Tooltip title={<div>
        Move the sliders right for a darker image or left for a brighter image.
        </div>}
      >
        <HelpOutlineIcon color="action" fontSize="large" />
      </Tooltip>
    </Box>
    <ColorModeToggle />
    { current.matches('color.color') && <RGBChannelController /> }
    { current.matches('color.grayscale') && <GrayscaleChannelController />}
  </>;
};

export default RawController;