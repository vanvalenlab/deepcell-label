import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ServiceContext';
import ToolButton from './ToolButton';

function FloodButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const onClick = useCallback(() => toolbar.send('USE_FLOOD'), [toolbar]);

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
