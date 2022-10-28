import { FormLabel } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../ProjectContext';
import ColorModeToggle from './ColorModeToggle';
import GrayscaleControlsTop from './GrayscaleControlsTop';
import RGBControlsTop from './RGBControlsTop';

export const RawControlsTop = () => {
  const raw = useRaw();
  const isGrayscale = useSelector(raw, (state) => state.context.isGrayscale);

  return (
    <>
        <Grid sx={{width: 150, marginLeft: 2}} container direction='column' spacing={3}>
            <Grid item>
                <FormLabel sx={{fontSize: 18}}> Image </FormLabel>
            </Grid>
            <Grid item>
                <ColorModeToggle />
            </Grid>
        </Grid>
        {isGrayscale ? <GrayscaleControlsTop /> : <RGBControlsTop />}
    </>
  );
};

export default RawControlsTop;
