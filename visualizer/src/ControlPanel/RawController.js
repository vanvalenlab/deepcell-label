import React from 'react';
import { useSelector } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import FormLabel from '@material-ui/core/FormLabel';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import ToggleButton from '@material-ui/lab/ToggleButton';

import { useRaw } from '../ServiceContext';
import LayerController from './LayerController';

export const MultiChannelController = () => {
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

export const SingleChannelController = () => {
  const raw = useRaw();
  const layer = useSelector(raw, state => state.context.layers[0]);
  
  return <Grid style={{ width: '100%' }} item >
    <LayerController layer={layer} />
  </Grid>;
}

export const RawController = () => {
  const raw = useRaw();
  const invert = useSelector(raw, state => state.context.invert);

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
    <MultiChannelController />
    
    <ToggleButton
      onClick={() => raw.send('TOGGLE_INVERT')}
      selected={invert}
      fullWidth
      variant="outlined"
      // style={{ borderStyle: 'dashed' }}
      size="medium"
    >
      Invert
    </ToggleButton>
  </>;
};

export default RawController;