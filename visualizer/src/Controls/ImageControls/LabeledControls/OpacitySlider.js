import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useLabeled } from '../../../ServiceContext';

const useStyles = makeStyles(theme => ({
  opacity: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: '20px',
    paddingTop: theme.spacing(1),
  },
}));

export const OpacitySlider = () => {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) =>
    labeled.send({ type: 'SET_OPACITY', opacity: newValue });

  const handleDoubleClick = event =>
    labeled.send({ type: 'SET_OPACITY', opacity: 0 });

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
