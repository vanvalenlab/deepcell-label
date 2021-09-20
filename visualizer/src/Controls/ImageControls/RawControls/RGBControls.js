import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import AddIcon from '@material-ui/icons/Add';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';
import LayerController from './LayerController';

function RGBControls() {
  const raw = useRaw();
  const colorMode = useSelector(raw, state => state.context.colorMode);
  const layers = useSelector(raw, state => {
    const colorMode = state.context.colorMode;
    const layers = colorMode.state.context.layers;
    return layers;
  });

  return (
    <>
      {layers.map(layer => (
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
