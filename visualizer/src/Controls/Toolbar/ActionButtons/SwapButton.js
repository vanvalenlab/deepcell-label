import React, { useCallback } from 'react';
import { useToolbar } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function SwapButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const toolbar = useToolbar();

  const onClick = useCallback(() => toolbar.send('SWAP'), [toolbar]);

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
