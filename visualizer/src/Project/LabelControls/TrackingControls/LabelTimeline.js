import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useHexColormap, useImage } from '../../ProjectContext';

function FrameBox({ frame, numFrames, color }) {
  const image = useImage();

  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height: '1rem',
    width: `${(1 / numFrames) * 100}%`,
    left: `${(frame / numFrames) * 100}%`,
    pointerEvents: 'none',
  };

  const onClick = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'SET_FRAME', frame: newValue });
    }
  };

  return <Box sx={boxStyle} onClick={onClick}></Box>;
}

function LabelTimeline({ label }) {
  const image = useImage();
  const numFrames = useSelector(image, (state) => state.context.numFrames);

  const colors = useHexColormap();
  const division = useDivision(label);
  const { frames } = division;
  const color = colors[label] ?? '#000000';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        height: '1rem',
        width: '100%',
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

export default React.memo(LabelTimeline);
