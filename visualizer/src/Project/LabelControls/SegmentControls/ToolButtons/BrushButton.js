import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment, useSelect } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function BrushButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  const select = useSelect();
  const selected = useSelector(select, (state) => state.context.selected);
  const foreground = useSelector(select, (state) => state.context.foreground);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'brush' });
    selected
      ? select.send({ type: 'FOREGROUND', foreground: selected })
      : select.send({ type: 'NEW_FOREGROUND' });
    select.send({ type: 'BACKGROUND', background: 0 });
  }, [segment, select, selected]);

  const tooltipText = (
    <span>
      Click and drag to paint a label <kbd>B</kbd>
    </span>
  );

  return (
    <ToolButton
      {...props}
      value='brush'
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
