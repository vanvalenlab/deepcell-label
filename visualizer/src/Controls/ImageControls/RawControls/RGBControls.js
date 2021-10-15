import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import AddIcon from '@material-ui/icons/Add';
import { useLayers, useRaw } from '../../../ProjectContext';
import LayerController from './LayerController';

function RGBControls() {
  const raw = useRaw();
  const layers = useLayers();

  return (
    <>
      {layers.map(layer => (
        <Grid key={layer.sessionId} style={{ width: '100%' }} item>
          <LayerController layer={layer} />
        </Grid>
      ))}
      <Button
        onClick={() => raw.send('ADD_LAYER')}
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
