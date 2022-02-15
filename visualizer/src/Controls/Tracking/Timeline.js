import { Box, FormLabel, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { default as React, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDivision, useSelect, useTracking } from '../../ProjectContext';
import FrameSlider from '../FrameSlider';
import Division, { Cell, DivisionFootprint } from './Division';
import LabelTimeline from './LabelTimeline';

// Renders a hidden division timeline to size the real divisions
function DivisionsFootprint({ footprintRef }) {
  return (
    <Box ref={footprintRef} sx={{ display: 'flex', visibility: 'hidden', position: 'absolute' }}>
      <DivisionFootprint />
      <DivisionFootprint />
    </Box>
  );
}

function Divisions({ label }) {
  const division = useDivision(label);

  const footprintRef = useRef();
  const [minWidth, setMinWidth] = useState(0);
  const [minHeight, setMinHeight] = useState(0);
  useLayoutEffect(() => {
    if (footprintRef.current) {
      setMinWidth(footprintRef.current.offsetWidth);
      setMinHeight(footprintRef.current.offsetHeight);
    }
  }, []);

  return (
    <>
      <DivisionsFootprint footprintRef={footprintRef} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minWidth,
          minHeight,
        }}
      >
        {label !== 0 && (
          <>
            <Box
              sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '50%' }}
            >
              {division.parent && <Division label={division.parent} />}
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '50%' }}
            >
              <Division label={label} />
            </Box>
          </>
        )}
      </Box>
    </>
  );
}

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
