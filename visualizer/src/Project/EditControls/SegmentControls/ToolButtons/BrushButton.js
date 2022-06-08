import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useBrush, useEditSegment, useSelect } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function BrushButton(props) {
  const segment = useEditSegment();
  const tool = useSelector(segment, (state) => state.context.tool);

  const brush = useBrush();
  const erase = useSelector(brush, (state) => state.context.erase);

  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'brush' });
    brush.send({ type: 'SET_ERASE', erase: false });
    if (cell === 0) {
      select.send('SELECT_NEW');
    }
  }, [segment, brush, select, cell]);

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
      selected={tool === 'brush' && !erase}
      hotkey='b'
      onClick={onClick}
    >
      Brush
    </ToolButton>
  );
}

export default BrushButton;
