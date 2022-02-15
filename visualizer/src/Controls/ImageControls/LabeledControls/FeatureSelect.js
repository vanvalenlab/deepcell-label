import { Grid, MenuItem, TextField, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled } from '../../../ProjectContext';

function FeatureSelect() {
  const labeled = useLabeled();
  const feature = useSelector(labeled, (state) => state.context.feature);
  const numFeatures = useSelector(labeled, (state) => state.context.numFeatures);
  const featureNames = useSelector(labeled, (state) => state.context.featureNames);

  const handleFeatureChange = (event) => {
    labeled.send({ type: 'LOAD_FEATURE', feature: Number(event.target.value) });
  };

  const tooltipText = (
    <span>
      Cycle with <kbd>F</kbd> or <kbd>Shift</kbd> + <kbd>F</kbd>
    </span>
  );

  useEffect(() => {
    const prevFeature = (feature - 1 + numFeatures) % numFeatures;
    const nextFeature = (feature + 1) % numFeatures;
    bind('shift+f', () => labeled.send({ type: 'LOAD_FEATURE', feature: prevFeature }));
    bind('f', () => labeled.send({ type: 'LOAD_FEATURE', feature: nextFeature }));
  }, [labeled, feature, numFeatures]);

  return (
    numFeatures > 1 && (
      <Grid item>
        <Tooltip title={tooltipText} placement='top'>
          <TextField select size='small' value={feature} onChange={handleFeatureChange}>
            {featureNames.map((name, index) => (
              <MenuItem key={index} value={index}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Tooltip>
      </Grid>
    )
  );
}

export default FeatureSelect;
