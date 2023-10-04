import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useEditSegment, useSelect } from '../../../ProjectContext';
import ActionButton from './ActionButton';

function SegmentAllButton(props) {
  const segment = useEditSegment();
  const grayscale = useSelector(segment, (state) => state.matches('display.grayscale'));

  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);

  const onClick = useCallback(() => segment.send('SEGMENTALL'), [segment]);

  const tooltipText = (
    <span>
      Generate all the segmentation masks <kbd>M</kbd>
    </span>
  );

  return (
    <ActionButton
      {...props}
      // disabled={!grayscale}
      tooltipText={grayscale ? tooltipText : 'Requires a single channel'}
      onClick={onClick}
      hotkey='m'
    >
      Segment All
    </ActionButton>
  );
}

export default SegmentAllButton;
