import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import React from 'react';
import FeatureSelect from './FeatureSelect';
import HighlightToggle from './HighlightToggle';
import LabelsOpacitySlider from './LabelsOpacitySlider';
import OutlineOpacitySlider from './OutlineOpacitySlider';
import OutlineToggle from './OutlineToggle';

const LabeledControls = () => {
  return (
    <>
      <Grid container direction='column'>
        <Grid item>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <FormLabel component='legend'>Segmentations</FormLabel>
            <OutlineToggle />
          </Box>
        </Grid>
        <Grid item>
          <Box
            display='flex'
            flexDirection='row'
            justifyContent='space-between'
            sx={{ width: '100%' }}
          >
            <FeatureSelect />
            <div />
            <HighlightToggle />
          </Box>
        </Grid>
        <Grid item>
          <Typography>Opacity</Typography>
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
