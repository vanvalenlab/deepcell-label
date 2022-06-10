import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import React from 'react';
import LabelsOpacitySlider from './CellsOpacitySlider';
import FeatureSelect from './FeatureSelect';
import HighlightToggle from './HighlightToggle';
import OutlineOpacitySlider from './OutlineOpacitySlider';

const LabeledControls = () => {
  return (
    <>
      <Grid container direction='column'>
        <Grid item>
          <FormLabel component='legend'>Segmentations</FormLabel>
        </Grid>
        <Grid item>
          <FeatureSelect />
        </Grid>
        <Grid item>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <Typography>Opacity</Typography>
            <HighlightToggle />
          </Box>
        </Grid>
        <Grid item>
          <LabelsOpacitySlider />
        </Grid>
        <Grid item>
          <OutlineOpacitySlider />
        </Grid>
      </Grid>
    </>
  );
};

export default LabeledControls;
