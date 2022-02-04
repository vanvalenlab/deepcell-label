import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function AutofitButton(props) {
  const segment = useSegment();
  const grayscale = useSelector(segment, (state) => state.matches('display.grayscale'));

  const onClick = useCallback(() => segment.send('AUTOFIT'), [segment]);

  const tooltipText = (
    <span>
      Fits a label to a channel <kbd>M</kbd>
    </span>
  );

  return (
    <ActionButton
      {...props}
      disabled={!grayscale}
      tooltipText={grayscale ? tooltipText : 'Requires a single channel'}
      onClick={onClick}
      hotkey='m'
    >
      Autofit
    </ActionButton>
  );
}

export default AutofitButton;
