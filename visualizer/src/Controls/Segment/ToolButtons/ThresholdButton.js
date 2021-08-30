import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function ThresholdButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, state => state.context.tool);
  const grayscale = useSelector(segment, state => state.matches('colorMode.grayscale'));

  const onClick = useCallback(() => segment.send('USE_THRESHOLD'), [segment]);

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
