import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function ShrinkButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('ERODE'), [segment]);

  const tooltipText = (
    <span>
      Contracts a label by one pixel <kbd>Q</kbd>
    </span>
  );

  return (
    <ActionButton
      {...rest}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey='q'
      className={`${className} ${styles.button}`}
    >
      Shrink
    </ActionButton>
  );
}

export default ShrinkButton;
