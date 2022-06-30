import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useBrush, useEditSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function EraserButton(props) {
  const segment = useEditSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  const brush = useBrush();
  const erase = useSelector(brush, (state) => state.context.erase);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'brush' });
    brush.send({ type: 'SET_ERASE', erase: true });
  }, [segment, brush]);

  const tooltipText = (
    <span>
      Click and drag to erase a label <kbd>E</kbd>
    </span>
  );

  return (
    <ToolButton
      {...props}
      value='eraser'
      tooltipText={tooltipText}
      selected={tool === 'brush' && erase}
      hotkey='e'
      onClick={onClick}
    >
      Eraser
    </ToolButton>
  );
}

export default EraserButton;
