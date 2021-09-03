import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function TrimButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, state => state.context.tool);

  const onClick = useCallback(() => segment.send('USE_TRIM'), [segment]);

  const tooltipText = (
    <span>
      Click a label to remove unconnected parts (<kbd>K</kbd>)
    </span>
  );

  return (
    <ToolButton
      {...props}
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
