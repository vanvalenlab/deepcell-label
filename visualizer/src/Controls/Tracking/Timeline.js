import { Box } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { default as React } from 'react';
import { useSelect, useTracking } from '../../ServiceContext';
import Division from './Division';
import FrameSlider from './FrameSlider';

function useDivision(label) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels);
  return division[label] || { parent: null, daughters: [], frame_div: null };
}

function Timeline() {
  const select = useSelect();
  const foreground = useSelector(select, state => state.context.foreground);
  const background = useSelector(select, state => state.context.background);
  const label = foreground ? foreground : background;

  const { parent } = useDivision(label);

  return (
    label !== 0 && (
      <Box>
        <FrameSlider label={label} />
        <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
          {parent && <Division label={parent} />}
          {/* Empty middle element keeps the second division on 
            the right side when the first is not present */}
          <Box></Box>
          <Division label={label} />
        </Box>
      </Box>
    )
  );
}

export default Timeline;
