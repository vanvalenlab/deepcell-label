import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import Slider from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled } from '../../../ProjectContext';

const useStyles = makeStyles(theme => ({
  opacity: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: '20px',
    paddingTop: theme.spacing(1),
  },
}));

function OpacitySlider() {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, state => state.context.opacity);

  const handleOpacityChange = (event, newValue) =>
    labeled.send({ type: 'SET_OPACITY', opacity: Number(newValue) });

  const handleDoubleClick = event => labeled.send({ type: 'SET_OPACITY', opacity: 0.3 });

  const styles = useStyles();

  const tooltipText = (
    <span>
      Cycle between raw, overlay, and labels with <kbd>Z</kbd>
    </span>
  );

  useEffect(() => {
    bind('z', () => labeled.send('CYCLE_OPACITY'));
    return () => unbind('z');
  }, [labeled]);

  return (
    <Tooltip title={tooltipText}>
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
    </Tooltip>
  );
}

export default OpacitySlider;
