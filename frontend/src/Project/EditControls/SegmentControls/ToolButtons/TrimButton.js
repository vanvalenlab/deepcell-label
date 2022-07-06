import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function TrimButton(props) {
  const segment = useEditSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  const onClick = useCallback(() => segment.send({ type: 'SET_TOOL', tool: 'trim' }), [segment]);

  const tooltipText = (
    <span>
      Click a label to remove unconnected parts <kbd>K</kbd>
    </span>
  );

  return (
    <ToolButton
      {...props}
      value='trim'
      tooltipText={tooltipText}
      selected={tool === 'trim'}
      onClick={onClick}
      hotkey='k'
    >
      Trim
    </ToolButton>
  );
}

export default TrimButton;
