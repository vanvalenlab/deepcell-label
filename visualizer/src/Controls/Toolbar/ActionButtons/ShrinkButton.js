import React, { useCallback } from 'react';
import { useToolbar } from '../../../ServiceContext';
import ActionButton, { useStyles } from './ActionButton';

function ShrinkButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const toolbar = useToolbar();

  const onClick = useCallback(() => toolbar.send('ERODE'), [toolbar]);

  const tooltipText = (
    <span>
      Contracts a label by one pixel (<kbd>Q</kbd>)
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
