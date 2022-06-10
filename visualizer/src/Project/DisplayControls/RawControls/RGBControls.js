import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../ProjectContext';
import LayerController from './LayerController';

function RGBControls() {
  const raw = useRaw();
  const layers = useSelector(raw, (state) => state.context.layers);
  const numChannels = useSelector(raw, (state) => state.context.numChannels);

  return (
    <>
      {layers.map((layer, index) => (
        <Grid key={layer.sessionId} sx={{ width: '100%' }} item>
          <LayerController layer={layer} />
        </Grid>
      ))}
      {numChannels > 1 && (
        <Button
          onClick={() => raw.send('ADD_LAYER')}
          fullWidth
          variant='outlined'
          sx={{ borderStyle: 'dashed' }}
          startIcon={<AddIcon />}
          size='medium'
        >
          Add Channel
        </Button>
      )}
    </>
  );
}

export default RGBControls;
