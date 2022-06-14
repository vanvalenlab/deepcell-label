import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React from 'react';
import {
  useCells,
  useHexColormap,
  useImage,
  useLabeled,
  useSelectedCell,
} from '../../ProjectContext';
import TimeBox from './TimeBox';

export function getRanges(array) {
  let ranges = [];
  for (let i = 0; i < array.length; i++) {
    let start = array[i];
    let end = start;
    // increment end index while array elements are consecutive
    while (array[i + 1] - array[i] === 1) {
      end = array[i + 1];
      i++;
    }
    ranges.push([start, end + 1]);
  }
  return ranges;
}

function CellTimeline({ cell, height }) {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  const labeled = useLabeled();
  const highlight = useSelector(labeled, (state) => state.context.highlight);
  const selected = useSelectedCell();

  const colors = useHexColormap();
  const color = highlight && cell === selected ? '#ff0000' : colors[cell] ?? '#000000';

  const cells = useCells();
  const times = useSelector(cells, (state) => state.context.cells.getTimes(cell), equal);
  const ranges = getRanges(times);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        height: '0.5rem',
        width: '100%',
        zIndex: 0,
      }}
    >
      {ranges.map(([start, end]) => (
        <TimeBox
          height={height}
          start={start}
          end={end}
          duration={duration}
          color={color}
          key={`${start},${end}`}
        />
      ))}
    </Box>
  );
}

export default React.memo(CellTimeline);
