import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegment, useSelect } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function AutofitButton(props) {
  const segment = useEditSegment();
  const grayscale = useSelector(segment, (state) => state.matches('display.grayscale'));

  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);

  const onClick = useCallback(() => {
    // Do not fit the background "cell 0"
    if (cell !== 0) {
      segment.send('AUTOFIT');
    }
  }, [segment, cell]);

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
