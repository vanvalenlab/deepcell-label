import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSelect, useToolbar } from '../../../ServiceContext';
import ToolButton from './ToolButton';

function EraserButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const select = useSelect();
  const selected = useSelector(select, state => state.context.selected);
  const background = useSelector(select, state => state.context.background);

  const onClick = useCallback(() => {
    toolbar.send('USE_BRUSH');
    select.send({ type: 'FOREGROUND', foreground: 0 });
    select.send({ type: 'BACKGROUND', background: selected });
  }, [toolbar, select, selected]);

  const tooltipText = (
    <span>
      Click and drag to erase a label (<kbd>E</kbd>)
    </span>
  );

  return (
    <ToolButton
      {...props}
      tooltipText={tooltipText}
      selected={tool === 'brush' && background !== 0}
      hotkey='e'
      onClick={onClick}
    >
      Eraser
    </ToolButton>
  );
}

export default EraserButton;
