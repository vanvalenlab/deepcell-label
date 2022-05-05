import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function ReplaceButton(props) {
  const segment = useSegment();
  const onClick = useCallback(() => segment.send('REPLACE'), [segment]);
  const tooltipText = (
    <span>
      Combines two labels <kbd>Shift</kbd> + <kbd>R</kbd>
    </span>
  );

  return (
    <ActionButton {...props} tooltipText={tooltipText} onClick={onClick} hotkey='shift+r'>
      Replace
    </ActionButton>
  );
}

export default ReplaceButton;
