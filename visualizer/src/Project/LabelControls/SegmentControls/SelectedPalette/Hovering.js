import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
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
    const { labeledArrays } = state.context;
    return labeledArrays && labeledArrays[feature][frame][y][x];
  });
  // get label(s) from overlaps array

  const overlaps = useOverlaps();
  const labels = useSelector(overlaps, (state) => state.context.overlaps?.[value]);

  return (
    <Box display='flex' justifyContent='center' flexDirection='column'>
      {!!labels && labels.map((label, i) => !!label && <Cell label={i} key={i} />)}
    </Box>
  );
}

export default OverlapHovering;
