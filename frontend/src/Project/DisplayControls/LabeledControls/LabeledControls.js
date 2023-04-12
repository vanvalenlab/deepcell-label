import { FormLabel } from '@mui/material';
import Grid from '@mui/material/Grid';
import CellsOpacitySlider from './CellsOpacitySlider';
import FeatureSelect from './FeatureSelect';
import OutlineOpacitySlider from './OutlineOpacitySlider';

const LabeledControls = () => {
  return (
    <>
      <Grid sx={{ width: 150 }} container direction='column' spacing={1}>
        <Grid item>
          <FormLabel sx={{ fontSize: 18 }}> Segmentation </FormLabel>
        </Grid>
        <Grid item>
          <FeatureSelect />
        </Grid>
      </Grid>
      <Grid sx={{ marginLeft: 0.2, width: 145 }} container direction='column' spacing={1}>
        <Grid item>
          <FormLabel>Cells Opacity</FormLabel>
          <CellsOpacitySlider />
        </Grid>
        <Grid item>
          <FormLabel>Outline Opacity</FormLabel>
          <OutlineOpacitySlider />
        </Grid>
      </Grid>
    </>
  );
};

export default LabeledControls;
