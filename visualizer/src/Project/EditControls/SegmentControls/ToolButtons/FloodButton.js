import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useEditSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function FloodButton(props) {
  const segment = useEditSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  const onClick = useCallback(() => segment.send({ type: 'SET_TOOL', tool: 'flood' }), [segment]);

  const tooltipText = (
    <span>
      Click a region to fill it with a label <kbd>G</kbd>
    </span>
  );

  useEffect(() => {
    bind('esc', () => segment.send('EXIT'));
  }, [segment]);

  return (
    <ToolButton
      {...props}
      value='flood'
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
