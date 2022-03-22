import React, { useCallback } from 'react';
import { useSegment } from '../../../../ProjectContext';
import ActionButton from './ActionButton';

function DeleteButton(props) {
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('DELETE'), [segment]);

  const tooltipText = (
    <span>
      Removes a label <kbd>Del</kbd> or <kbd>Backspace</kbd>
    </span>
  );

  return (
    <ActionButton
      {...props}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey={['del', 'backspace']}
    >
      Delete
    </ActionButton>
  );
}

export default DeleteButton;
