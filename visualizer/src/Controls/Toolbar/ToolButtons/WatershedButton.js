import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ProjectContext';
import ToolButton from './ToolButton';

function WatershedButton(props) {
  const toolbar = useToolbar();
  const tool = useSelector(toolbar, state => state.context.tool);
  const grayscale = useSelector(toolbar, state => state.matches('colorMode.grayscale'));

  const onClick = useCallback(() => toolbar.send('USE_WATERSHED'), [toolbar]);

  const tooltipText = grayscale ? (
    <span>
      Click on two spots in the same label to split it (<kbd>W</kbd>)
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
