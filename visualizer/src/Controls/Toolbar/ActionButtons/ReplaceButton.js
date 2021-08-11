import React, { useCallback } from 'react';
import { useToolbar } from '../../../ServiceContext';
import ActionButton, { useStyles } from './ActionButton';

function ReplaceButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const toolbar = useToolbar();

  const onClick = useCallback(() => toolbar.send('REPLACE'), [toolbar]);

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
