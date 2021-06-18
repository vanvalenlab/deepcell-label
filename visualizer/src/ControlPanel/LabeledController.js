import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Select from '@material-ui/core/Select';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { useSelector } from '@xstate/react';
import React, { useRef, useEffect } from 'react';

import { useLabeled } from '../ServiceContext';

const useStyles = makeStyles(theme => ({
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  opacity: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: '20px',
    paddingTop: theme.spacing(1),
  },
}));

export const FeatureSelect = () => {
  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);
  const numFeatures = useSelector(labeled, state => state.context.numFeatures);
  const featureNames = useSelector(
    labeled,
    state => state.context.featureNames
  );

  const handleFeatureChange = event => {
    labeled.send({ type: 'LOAD_FEATURE', feature: Number(event.target.value) });
  };

  return (
    numFeatures > 1 && (
      <Grid item>
        <Tooltip
          title={
            <span>
              Cycle with <kbd>F</kbd> or <kbd>Shift</kbd> + <kbd>F</kbd>.
            </span>
          }
        >
          <Select native value={feature} onChange={handleFeatureChange}>
            {featureNames.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </Select>
        </Tooltip>
      </Grid>
    )
  );
};

export const OpacitySlider = () => {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) => {
    labeled.send({ type: 'SET_OPACITY', opacity: newValue });
  };
  const handleDoubleClick = event => {
    const newOpacity = opacity === 0 ? 1 : opacity === 1 ? 0.3 : 0;
    labeled.send({ type: 'SET_OPACITY', opacity: newOpacity });
  };

  const styles = useStyles();

  return (
    <Box className={styles.opacity}>
      <Typography gutterBottom>Opacity</Typography>
      <Slider
        value={opacity}
        valueLabelDisplay='auto'
        min={0}
        max={1}
        step={0.01}
        onChange={handleOpacityChange}
        onDoubleClick={handleDoubleClick}
      />
    </Box>
  );
};

function OutlineToggle() {
  const labeled = useLabeled();
  const outline = useSelector(labeled, state => state.context.outline);
  const { send } = labeled;

  // Adds mousetrap class so hotkeys work after using switch
  const inputRef = useRef();
  useEffect(() => {
    const input = inputRef.current;
    input.className = input.className + ' mousetrap';
  }, []);

  return (
    <Tooltip title='Press O to toggle'>
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={outline}
              onChange={() => send('TOGGLE_OUTLINE')}
              inputRef={inputRef}
            />
          }
          label='Outline'
          labelPlacement='start'
        />
      </FormGroup>
    </Tooltip>
  );
}

const LabeledController = () => {
  const styles = useStyles();

  return (
    <>
      <Grid container direction='column' className={styles.root}>
        <Grid item>
          <Box
            display='flex'
            flexDirection='row'
            justifyContent='space-between'
          >
            <FormLabel component='legend' className={styles.title}>
              Segmentations
            </FormLabel>
            <OutlineToggle />
          </Box>
        </Grid>
        <Grid item>
          <FeatureSelect />
        </Grid>
        <Grid item>
          <OpacitySlider />
        </Grid>
      </Grid>
    </>
  );
};

//         {/* <Grid container direction="row" justify="flex-start" alignItems="center"> */}

export default LabeledController;
