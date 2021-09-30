import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment, useSelect } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function EraserButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, state => state.context.tool);

  const select = useSelect();
  const selected = useSelector(select, state => state.context.selected);
  const background = useSelector(select, state => state.context.background);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'brush' });
    select.send({ type: 'FOREGROUND', foreground: 0 });
    select.send({ type: 'BACKGROUND', background: selected });
  }, [segment, select, selected]);

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
