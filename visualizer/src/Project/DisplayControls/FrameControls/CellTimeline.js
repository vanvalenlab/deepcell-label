import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import React from 'react';
import { useCells, useHexColormap, useImage } from '../../ProjectContext';
import FrameBox from './FrameBox';

function CellTimeline({ cell }) {
  const image = useImage();
  const numFrames = useSelector(image, (state) => state.context.numFrames);

  const colors = useHexColormap();
  const color = colors[cell] ?? '#000000';

  const cells = useCells();
  const frames = useSelector(cells, (state) => state.context.cells.getFrames(cell), equal);

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
      {[...Array(numFrames).keys()].map((frame) => (
        <FrameBox
          frame={frame}
          numFrames={numFrames}
          color={frames.includes(frame) ? color : '#FFFFFF'}
          key={frame}
        />
      ))}
    </Box>
  );
}

export default React.memo(CellTimeline);
