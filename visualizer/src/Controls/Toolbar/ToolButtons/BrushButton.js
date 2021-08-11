import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSelect, useToolbar } from '../../../ServiceContext';
import ToolButton from './ToolButton';

function BrushButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);

  const select = useSelect();
  const selected = useSelector(select, state => state.context.selected);
  const foreground = useSelector(select, state => state.context.foreground);

  const onClick = useCallback(() => {
    toolbar.send('USE_BRUSH');
    selected
      ? select.send({ type: 'FOREGROUND', foreground: selected })
      : select.send({ type: 'NEW_FOREGROUND' });
    select.send({ type: 'BACKGROUND', background: 0 });
  }, [toolbar, select, selected]);

  const tooltipText = (
    <span>
      Click and drag to paint a label (<kbd>B</kbd>)
    </span>
  );

  return (
    <ToolButton
      {...props}
      tooltipText={tooltipText}
      selected={tool === 'brush' && foreground !== 0}
      hotkey='b'
      onClick={onClick}
    >
      Brush
    </ToolButton>
  );
}

export default BrushButton;
