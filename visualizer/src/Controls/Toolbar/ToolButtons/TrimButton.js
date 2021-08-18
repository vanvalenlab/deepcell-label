import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function TrimButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const onClick = useCallback(() => toolbar.send('USE_TRIM'), [toolbar]);

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
