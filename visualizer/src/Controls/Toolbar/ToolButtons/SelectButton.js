import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ServiceContext';
import ToolButton from './ToolButton';

function SelectButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const onClick = useCallback(() => toolbar.send('USE_SELECT'), [toolbar]);

  const tooltipText = (
    <span>
      Click to pick the foreground.
      <br />
      Click the foreground to make it the background. (<kbd>V</kbd>)
    </span>
  );

  return (
    <ToolButton
      {...props}
      hotkey='v'
      tooltipText={tooltipText}
      selected={tool === 'select'}
      onClick={onClick}
    >
      Select
    </ToolButton>
  );
}

export default SelectButton;
