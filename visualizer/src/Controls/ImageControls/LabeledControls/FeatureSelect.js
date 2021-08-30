import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useEffect } from 'react';
import { useLabeled } from '../../../ProjectContext';

function FeatureSelect() {
  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);
  const numFeatures = useSelector(labeled, state => state.context.numFeatures);
  const featureNames = useSelector(labeled, state => state.context.featureNames);

  const handleFeatureChange = event => {
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
    return () => {
      unbind('shift+f');
      unbind('f');
    };
  }, [labeled, feature, numFeatures]);

  return (
    numFeatures > 1 && (
      <Grid item>
        <Tooltip title={tooltipText}>
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
}

export default FeatureSelect;
