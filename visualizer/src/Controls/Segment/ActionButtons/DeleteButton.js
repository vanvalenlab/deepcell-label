import React, { useCallback } from 'react';
import { useSegment } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function DeleteButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const segment = useSegment();

  const onClick = useCallback(() => segment.send('DELETE'), [segment]);

  const tooltipText = (
    <span>
      Removes a label (<kbd>Del</kbd>)
    </span>
  );

  return (
    <ActionButton
      {...rest}
      tooltipText={tooltipText}
      onClick={onClick}
      hotkey={['del', 'backspace']}
      className={`${className} ${styles.button}`}
    >
      Delete
    </ActionButton>
  );
}

export default DeleteButton;
