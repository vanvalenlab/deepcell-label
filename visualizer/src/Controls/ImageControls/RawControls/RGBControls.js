import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';
import LayerController from './LayerController';

function RGBControls() {
  const raw = useRaw();
  const colorMode = useSelector(raw, (state) => state.context.colorMode);
  const layers = useSelector(colorMode, (state) => state.context.layers);

  return (
    <>
      {layers.map((layer, index) => (
        <Grid key={layer.sessionId} style={{ width: '100%' }} item>
          <LayerController layer={layer} />
        </Grid>
      ))}
      <Button
        onClick={() => colorMode.send('ADD_LAYER')}
        fullWidth
        variant='outlined'
        style={{ borderStyle: 'dashed' }}
        startIcon={<AddIcon />}
        size='medium'
      >
        Add Channel
      </Button>
    </>
  );
}

export default RGBControls;
