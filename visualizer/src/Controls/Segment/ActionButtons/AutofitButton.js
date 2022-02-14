import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function AutofitButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();
  const grayscale = useSelector(segment, (state) => state.matches('idle.display.grayscale'));

  const onClick = useCallback(() => segment.send('AUTOFIT'), [segment]);

  const tooltipText = (
    <span>
      Fits a label to a channel <kbd>M</kbd>
    </span>
  );

  return (
    <ActionButton
      {...rest}
      disabled={!grayscale}
      tooltipText={grayscale ? tooltipText : 'Requires a single channel'}
      onClick={onClick}
      hotkey='m'
      className={`${className} ${styles.button}`}
    >
      Autofit
    </ActionButton>
  );
}

export default AutofitButton;
