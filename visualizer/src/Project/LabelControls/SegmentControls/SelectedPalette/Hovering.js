import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React from 'react';
import { useArrays, useCanvas, useOverlaps } from '../../../ProjectContext';
import Cell from './Cell';

function OverlapHovering() {
  // get coordinates
  const canvas = useCanvas();
  const x = useSelector(canvas, (state) => state.context.x);
  const y = useSelector(canvas, (state) => state.context.y);
  // get value from label array
  const arrays = useArrays();
  const feature = useSelector(arrays, (state) => state.context.feature);
  const frame = useSelector(arrays, (state) => state.context.frame);
  const value = useSelector(arrays, (state) => {
    const { labeled } = state.context;
    return labeled && labeled[feature][frame][y][x];
  });
  // get label(s) from overlaps array

  const overlaps = useOverlaps();
  const cells = useSelector(
    overlaps,
    (state) => state.context.overlaps?.getCellsForValue(value, frame),
    equal
  );

  return (
    <Box display='flex' justifyContent='center' flexDirection='column'>
      {!!cells && cells.map((cell) => <Cell cell={cell} key={cell} />)}
    </Box>
  );
}

export default OverlapHovering;
