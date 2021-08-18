import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function ThresholdButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);
  const grayscale = useSelector(toolbar, state => state.matches('colorMode.grayscale'));

  const onClick = useCallback(() => toolbar.send('USE_THRESHOLD'), [toolbar]);

  const tooltipText = grayscale ? (
    <span>
      Click and drag to fill in the brightest pixels in a box (<kbd>T</kbd>)
    </span>
  ) : (
    'Requires a single channel'
  );

  return (
    <ToolButton
      {...props}
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
