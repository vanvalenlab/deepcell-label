import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import FeatureSelect from './FeatureSelect';
import HighlightToggle from './HighlightToggle';
import OpacitySlider from './OpacitySlider';
import OutlineToggle from './OutlineToggle';

const useStyles = makeStyles(theme => ({
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

const LabeledControls = () => {
  const styles = useStyles();

  return (
    <>
      <Grid container direction='column' className={styles.root}>
        <Grid item>
          <Box display='flex' flexDirection='row' justifyContent='space-between'>
            <FormLabel component='legend' className={styles.title}>
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
