import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function SwapButton(props) {
  const segment = useSegment();
  const onClick = useCallback(() => segment.send('SWAP'), [segment]);
  const tooltipText = (
    <span>
      Switches the position of two labels <kbd>Shift</kbd> + <kbd>S</kbd>
    </span>
  );

  return (
    <ActionButton {...props} tooltipText={tooltipText} onClick={onClick} hotkey='shift+s'>
      Swap
    </ActionButton>
  );
}

export default SwapButton;
