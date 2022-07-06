import { FormLabel } from '@mui/material';
import Grid from '@mui/material/Grid';
import React from 'react';
import CellsOpacitySlider from './CellsOpacitySlider';
import FeatureSelect from './FeatureSelect';
import OutlineOpacitySlider from './OutlineOpacitySlider';

const LabeledControls = () => {
  return (
    <>
      <Grid container direction='column'>
        <Grid item>
          <FeatureSelect />
        </Grid>
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
