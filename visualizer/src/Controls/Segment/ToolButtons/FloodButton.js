import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ServiceContext';
import ToolButton from './ToolButton';

function FloodButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, state => state.context.tool);

  const onClick = useCallback(() => segment.send('USE_FLOOD'), [segment]);

  const tooltipText = (
    <span>
      Click a region to fill it with a label (<kbd>G</kbd>)
    </span>
  );

  return (
    <ToolButton
      {...props}
      tooltipText={tooltipText}
      selected={tool === 'flood'}
      onClick={onClick}
      hotkey='g'
    >
      Flood
    </ToolButton>
  );
}

export default FloodButton;
