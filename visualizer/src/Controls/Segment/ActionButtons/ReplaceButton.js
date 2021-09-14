import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function ReplaceButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('REPLACE'), [segment]);

  const tooltipText = (
    <span>
      Combines two labels (<kbd>R</kbd>)
    </span>
  );

  return (
    <ActionButton
      {...rest}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey='r'
      className={`${className} ${styles.button}`}
    >
      Replace
    </ActionButton>
  );
}

export default ReplaceButton;
