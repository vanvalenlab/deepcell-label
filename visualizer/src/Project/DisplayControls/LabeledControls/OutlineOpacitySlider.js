import { Grid } from '@mui/material';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useLabeled, useMousetrapRef } from '../../ProjectContext';

function OutlineOpacitySlider() {
  const labeled = useLabeled();
  const opacity = useSelector(labeled, (state) => state.context.outlineOpacity);

  const inputRef = useMousetrapRef();

  const handleOpacityChange = (event, newValue) =>
    labeled.send({ type: 'SET_OUTLINE_OPACITY', opacity: newValue });

  const handleDoubleClick = (event) =>
    labeled.send({ type: 'SET_OUTLINE_OPACITY', opacity: [0.3, 1] });

  const tooltipText = (
    <span>
      Low sets opacity for all outlines
      <br />
      High sets opacity for selected outline
    </span>
  );

  return (
    <Tooltip title={tooltipText}>
      <Grid container>
        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end', pr: 1 }}>
          <Typography>Outline</Typography>
        </Grid>
        <Grid item xs={8} sx={{ display: 'flex', alignItems: 'center' }}>
          <Slider
            value={opacity}
            valueLabelDisplay='auto'
            min={0}
            max={1}
            track={false}
            step={0.01}
            onChange={handleOpacityChange}
            onDoubleClick={handleDoubleClick}
            componentsProps={{ input: { ref: inputRef } }}
            sx={{ py: 0 }}
          />
        </Grid>
      </Grid>
    </Tooltip>
  );
}

export default OutlineOpacitySlider;
