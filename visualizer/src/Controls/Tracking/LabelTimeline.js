import { Box } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivision, useFeature, useImage, useLabeled } from '../../ProjectContext';

function useColors() {
  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  return colors;
}

function FrameBox({ frame, numFrames, color }) {
  const image = useImage();

  const boxStyle = {
    position: 'absolute',
    backgroundColor: color,
    height: '10px',
    width: `${(1 / numFrames) * 100}%`,
    left: `${(frame / numFrames) * 100}%`,
    pointerEvents: 'none',
  };

  const onClick = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOAD_FRAME', frame: newValue });
    }
  };

  return <Box style={boxStyle} onClick={onClick}></Box>;
}

function LabelTimeline({ label }) {
  const image = useImage();
  const numFrames = useSelector(image, state => state.context.numFrames);

  const colors = useColors();
  const division = useDivision(label);
  const { frames } = division;
  const color = colors[label];

  return (
    <Box
      style={{
        position: 'relative',
        display: 'flex',
        height: '10px',
        width: '100%',
      }}
    >
      {[...Array(numFrames).keys()].map(frame => (
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
