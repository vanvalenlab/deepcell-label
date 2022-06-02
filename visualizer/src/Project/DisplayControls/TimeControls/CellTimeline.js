import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React from 'react';
import { useCells, useHexColormap, useImage } from '../../ProjectContext';
import TimeBox from './TimeBox';

function CellTimeline({ cell }) {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  const colors = useHexColormap();
  const color = colors[cell] ?? '#000000';

  const cells = useCells();
  const times = useSelector(cells, (state) => state.context.cells.getTimes(cell), equal);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        height: '0.5rem',
        width: '100%',
        zIndex: -1,
      }}
    >
      {[...Array(duration).keys()].map((t) => (
        <TimeBox t={t} duration={duration} color={times.includes(t) ? color : '#FFFFFF'} key={t} />
      ))}
    </Box>
  );
}

export default React.memo(CellTimeline);
