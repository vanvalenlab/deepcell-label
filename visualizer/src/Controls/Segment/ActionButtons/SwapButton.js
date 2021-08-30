import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function SwapButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('SWAP'), [segment]);

  const tooltipText = (
    <span>
      Switches the position of two labels (<kbd>S</kbd>)
    </span>
  );

  return (
    <ActionButton
      {...rest}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey='s'
      className={`${className} ${styles.button}`}
    >
      Swap
    </ActionButton>
  );
}

export default SwapButton;
