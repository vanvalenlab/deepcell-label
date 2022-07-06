import React, { useCallback } from 'react';
import { useEditSegment } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function GrowButton(props) {
  const segment = useEditSegment();

  const onClick = useCallback(() => segment.send('DILATE'), [segment]);

  const tooltipText = (
    <span>
      Expands a label by one pixel <kbd>Shift</kbd> + <kbd>Q</kbd>
    </span>
  );

  return (
    <ActionButton {...props} tooltipText={tooltipText} onClick={onClick} hotkey='shift+q'>
      Grow
    </ActionButton>
  );
}

export default GrowButton;
