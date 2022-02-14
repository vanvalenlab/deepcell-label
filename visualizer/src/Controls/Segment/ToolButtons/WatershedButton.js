import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function WatershedButton(props) {
  const segment = useSegment();
  const tool = useSelector(segment, (state) => state.context.tool);
  const grayscale = useSelector(segment, (state) => state.matches('idle.display.grayscale'));

  const onClick = useCallback(
    () => segment.send({ type: 'SET_TOOL', tool: 'watershed' }),
    [segment]
  );

  const tooltipText = grayscale ? (
    <span>
      Click on two spots in the same label to split it <kbd>W</kbd>
    </span>
  ) : (
    'Requires a single channel'
  );

  return (
    <ToolButton
      {...props}
      tooltipText={tooltipText}
      selected={tool === 'watershed'}
      onClick={onClick}
      hotkey='w'
      disabled={!grayscale}
    >
      Watershed
    </ToolButton>
  );
}

export default WatershedButton;
