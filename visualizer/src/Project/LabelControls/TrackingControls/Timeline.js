import { Box, FormLabel, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { default as React, useEffect } from 'react';
import FrameSlider from '../../FrameSlider';
import { useSelect, useTracking } from '../../ProjectContext';
import Cell from './Division/Cell';
import Divisions from './Divisions';
import LabelTimeline from './LabelTimeline';

function Timeline() {
  const select = useSelect();
  const selected = useSelector(select, (state) => state.context.selected);
  const hovering = useSelector(select, (state) => state.context.hovering);

  const tracking = useTracking();
  const addingDaughter = useSelector(tracking, (state) => state.matches('addingDaughter'));
  const parent = useSelector(tracking, (state) => state.context.parent);

  useEffect(() => {
    bind('n', () => select.send('NEW_FOREGROUND'));
    bind('esc', () => {
      tracking.send('RESET');
      select.send('RESET_FOREGROUND');
      select.send('RESET_BACKGROUND');
    });
    bind('[', () => select.send('PREV_FOREGROUND'));
    bind(']', () => select.send('NEXT_FOREGROUND'));
    return () => {
      unbind('n');
      unbind('esc');
      unbind('[');
      unbind(']');
    };
  }, [select, tracking]);

  return (
    <Box m={1}>
      {addingDaughter && (
        <Typography sx={{ maxWidth: '100%' }}>
          Click a label to add a daughter to label {parent}.
        </Typography>
      )}
      <FormLabel>Selected Label</FormLabel>
      <Divisions label={selected} />
      <FormLabel>Frames</FormLabel>
      <LabelTimeline label={selected} />
      <FrameSlider showLabel={false} />
      <LabelTimeline label={hovering} />
      <FormLabel>Hovering over Label</FormLabel>
      {hovering !== null && <Cell label={hovering} />}
    </Box>
  );
}

export default Timeline;
