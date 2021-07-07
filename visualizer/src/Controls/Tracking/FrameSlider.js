import { Box, makeStyles, Slider } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import React, { useEffect, useState } from 'react';
import {
  useFeature,
  useImage,
  useLabeled,
  useTracking,
} from '../../ServiceContext';

function useDivision(label) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels);
  return (
    division[label] || {
      parent: null,
      daughters: [],
      divisionFrame: null,
      parentDivisionFrame: null,
      frames: [],
    }
  );
}

function useColors() {
  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  return colors;
}

const useStyles = makeStyles(theme => ({
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

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

function FrameSlider({ label }) {
  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);
  const numFrames = useSelector(image, state => state.context.numFrames);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOAD_FRAME', frame: newValue });
    }
  };

  const tooltipText = (
    <span>
      Cycle with <kbd>A</kbd> and <kbd>D</kbd>.
    </span>
  );

  const styles = useStyles();

  const [display, setDisplay] = useState('on');

  // Display label for a second after the label changes
  useEffect(() => {
    setDisplay('on');
    const displayTimeout = setTimeout(() => setDisplay('auto'), 1000);
    return () => clearTimeout(displayTimeout);
  }, [frame]);

  const colors = useColors();
  const division = useDivision(label);
  const { parent, divisionFrame, frames } = division;
  const parentDivision = useDivision(parent);

  const startFrame = parentDivision ? parentDivision.divisionFrame : 0;
  const endFrame = divisionFrame ? divisionFrame : numFrames;
  const color = colors[label];

  const boxStyle = {
    position: 'relative',
    backgroundColor: colors[label],
    height: '10px',
    width: `${((endFrame - startFrame) / numFrames) * 100}%`,
    left: `${(startFrame / numFrames) * 100}%`,
  };

  return (
    numFrames > 1 && (
      <>
        <Box>
          <Slider
            value={frame}
            valueLabelDisplay={display}
            step={1}
            marks
            min={0}
            max={numFrames - 1}
            onChange={handleFrameChange}
          />
          <Box
            style={{
              position: 'relative',
              display: 'flex',
              height: '10px',
              width: '100%',
            }}
          >
            {frames.map(frame => (
              <FrameBox
                frame={frame}
                numFrames={numFrames}
                color={color}
                key={frame}
              />
            ))}
          </Box>
        </Box>
      </>
    )
  );
}

export default FrameSlider;
