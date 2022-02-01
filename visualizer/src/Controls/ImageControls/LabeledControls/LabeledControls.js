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
            <FormLabel component='legend' sx={{ py: 1 }}>
              Segmentations
            </FormLabel>
            <OutlineToggle />
          </Box>
        </Grid>
        <Grid item>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <FeatureSelect />
            <HighlightToggle />
          </Box>
        </Grid>
        <Grid item>
          <OpacitySlider />
        </Grid>
      </Grid>
    </>
  );
};

export default LabeledControls;
