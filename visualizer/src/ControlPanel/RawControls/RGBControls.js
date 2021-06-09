import React, { useEffect, useRef } from 'react';
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
import Select from '@material-ui/core/Select';

import { useRaw, useImage } from '../../ServiceContext';
import LayerController, { ChannelController } from './LayerController';

function RGBControls() {
  const raw = useRaw();
  const colorMode = useSelector(raw, state => state.context.colorMode);
  const layers = useSelector(colorMode, state => state.context.layers);
  
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

export default RGBControls;
