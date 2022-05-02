import { Box, FormLabel } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { default as React, useEffect } from 'react';
import FrameSlider from '../../FrameSlider';
import { useCanvas, useEditing, useLineage } from '../../ProjectContext';
import Cells from './Cells';
import Cell from './Division/Cell';
import Divisions from './Divisions';
import EditingPrompt from './EditingPrompt';
import LabelTimeline from './LabelTimeline';

function Timeline() {
  const canvas = useCanvas();
  const hovering = useSelector(canvas, (state) => state.context.hovering);

  const lineage = useLineage();
  const selected = useSelector(lineage, (state) => state.context.selected);

  const parent = useSelector(tracking, (state) => state.context.parent);

  const editing = useEditing();

  useEffect(() => {
    bind('esc', () => {
      lineage.send('RESET_CELL');
    });
    bind('[', () => lineage.send('PREV_CELL'));
    bind(']', () => lineage.send('NEXT_CELL'));
    return () => {
      unbind('esc');
      unbind('[');
      unbind(']');
    };
  }, [lineage]);

  return (
    <Box>
      <FormLabel>Frames</FormLabel>
      <FrameSlider showLabel={false} />
      <LabelTimeline label={selected} />
      <LabelTimeline label={hovering} />
      <Cells />
      <Cell />
      <Divisions />
      {editing && <EditingPrompt />}
    </Box>
  );
}

export default Timeline;
