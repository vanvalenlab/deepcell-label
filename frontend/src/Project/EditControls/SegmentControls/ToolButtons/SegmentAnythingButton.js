import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegmentCopy } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function SegmentAnythingButton(props) {
  const segment = useEditSegmentCopy();
  const tool = useSelector(segment, (state) => state.context.tool);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'sam' })
  }, [segment]);

  const tooltipText = (
    <span>
      SAM <kbd>s</kbd>
    </span>
  );

  return (
    <ToolButton
      {...props}
      value='sam'
      tooltipText={tooltipText}
      selected={tool === 'sam'}
      onClick={onClick}
      hotkey='k'
    >
      Segment Anything
    </ToolButton>
  );
}

export default SegmentAnythingButton;
