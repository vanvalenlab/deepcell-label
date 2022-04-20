import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import React from 'react';
import FeatureSelect from './FeatureSelect';
import HighlightToggle from './HighlightToggle';
import OpacitySlider from './OpacitySlider';
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
        <Grid container direction='row'>
          <Grid item xs={4}>
            <Typography>Opacity</Typography>
          </Grid>
          <Grid container item xs={8} alignItems='center'>
            <OpacitySlider />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default LabeledControls;
