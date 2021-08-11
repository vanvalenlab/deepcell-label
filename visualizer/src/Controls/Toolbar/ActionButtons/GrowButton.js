import React, { useCallback } from 'react';
import { useToolbar } from '../../../ServiceContext';
import ActionButton, { useStyles } from './ActionButton';

function GrowButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const toolbar = useToolbar();

  const onClick = useCallback(() => toolbar.send('DILATE'), [toolbar]);

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
