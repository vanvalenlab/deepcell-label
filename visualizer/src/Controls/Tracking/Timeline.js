import { Box, FormLabel, Typography } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { default as React } from 'react';
import { useSelect, useTracking } from '../../ProjectContext';
import Division from './Division';
import FrameSlider from './FrameSlider';
import LabelTimeline from './LabelTimeline';

function Divisions({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);

  return (
    label !== 0 && (
      <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
        {division?.parent && <Division label={division.parent} />}
        {/* Empty middle element keeps the second division on 
            the right side when the first is not present */}
        <Box></Box>
        <Division label={label} />
      </Box>
    )
  );
}

function Timeline() {
  const select = useSelect();
  const selected = useSelector(select, state => state.context.selected);
  const hovering = useSelector(select, state => state.context.label);

  const tracking = useTracking();
  const addingDaughter = useSelector(tracking, state => state.matches('addingDaughter'));
  const parent = useSelector(tracking, state => state.context.parent);

  return (
    <Box m={1}>
      {addingDaughter && (
        <Typography style={{ maxWidth: '100%' }}>
          Click a label to add a daughter to label {parent}.
        </Typography>
      )}
      <FormLabel>Selected Label</FormLabel>
      <Divisions label={selected} />
      <LabelTimeline label={selected} />
      <FrameSlider topLabel={selected} bottomLabel={hovering} />
      <LabelTimeline label={hovering} />
      <FormLabel>Hovering over Label</FormLabel>
      <Divisions label={hovering} />
    </Box>
  );
}

export default Timeline;
