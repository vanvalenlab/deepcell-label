import { Box, Typography } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { default as React } from 'react';
import { useSelect, useTracking } from '../../ServiceContext';
import Division from './Division';
import FrameSlider from './FrameSlider';

function useDivision(label) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels);
  return (
    division[label] || {
      frames: [],
      parent: null,
      daughters: [],
      divisionFrame: null,
      parentDivisionFrame: null,
    }
  );
}

function Timeline() {
  const select = useSelect();
  const foreground = useSelector(select, state => state.context.foreground);
  const background = useSelector(select, state => state.context.background);
  const label = foreground ? foreground : background;

  const tracking = useTracking();
  const addingDaughter = useSelector(tracking, state => state.matches('addingDaughter'));
  const division = useSelector(tracking, state => state.context.labels[label]);

  return (
    <Box>
      <FrameSlider label={label} />
      {label !== 0 && (
        <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
          {division?.parent && <Division label={division.parent} />}
          {/* Empty middle element keeps the second division on 
            the right side when the first is not present */}
          <Box></Box>
          <Division label={label} />
        </Box>
      )}
      {addingDaughter && <Typography>Click on a label to add it as a daughter.</Typography>}
    </Box>
  );
}

export default Timeline;
