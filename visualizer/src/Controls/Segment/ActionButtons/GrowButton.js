import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function GrowButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('DILATE'), [segment]);

  const tooltipText = (
    <span>
      Expands a label by one pixel (<kbd>Shift</kbd> + <kbd>Q</kbd>)
    </span>
  );

  return (
    <ActionButton
      {...rest}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey='shift+q'
      className={`${className} ${styles.button}`}
    >
      Grow
    </ActionButton>
  );
}

export default GrowButton;
