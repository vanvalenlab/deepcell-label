import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegment, useSelect } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function ThresholdButton(props) {
  const segment = useEditSegment();
  const tool = useSelector(segment, (state) => state.context.tool);
  const grayscale = useSelector(segment, (state) => state.matches('display.grayscale'));

  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);

  const onClick = useCallback(() => {
    segment.send({ type: 'SET_TOOL', tool: 'threshold' });
    if (cell === 0) {
      select.send('SELECT_NEW');
    }
  }, [segment, select, cell]);

  const tooltipText = grayscale ? (
    <span>
      Click and drag to fill in the brightest pixels in a box <kbd>T</kbd>
    </span>
  ) : (
    'Requires a single channel'
  );

  return (
    <ToolButton
      {...props}
      value='threshold'
      tooltipText={tooltipText}
      selected={tool === 'threshold'}
      onClick={onClick}
      hotkey='t'
      disabled={!grayscale}
    >
      Threshold
    </ToolButton>
  );
}

export default ThresholdButton;
