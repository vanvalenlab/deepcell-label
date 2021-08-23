import { Box, Typography } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { default as React } from 'react';
import { useSelect, useTracking } from '../../ProjectContext';
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
  const selected = useSelector(select, state => state.context.selected);
  const label = useSelector(select, state => state.context.label);

  const tracking = useTracking();
  const addingDaughter = useSelector(tracking, state => state.matches('addingDaughter'));
  const division = useSelector(tracking, state => state.context.labels[selected]);
  const parent = useSelector(tracking, state => state.context.parent);

  return (
    <Box>
      <FrameSlider label={selected} />
      <Typography>Hovering over label: {label !== 0 && label}</Typography>
      {selected !== 0 && (
        <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
          {division?.parent && <Division label={division.parent} />}
          {/* Empty middle element keeps the second division on 
            the right side when the first is not present */}
          <Box></Box>
          <Division label={selected} />
        </Box>
      )}
      {addingDaughter && (
        <Typography>Click on a label to add a daughter to label {parent}.</Typography>
      )}
    </Box>
  );
}

export default Timeline;
