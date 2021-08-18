import { useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { useToolbar } from '../../../ProjectContext';
import ActionButton, { useStyles } from './ActionButton';

function AutofitButton(props) {
  const { className, ...rest } = props;
  const styles = useStyles();
  const toolbar = useToolbar();
  const grayscale = useSelector(toolbar, state => state.matches('colorMode.grayscale'));

  const onClick = useCallback(() => toolbar.send('AUTOFIT'), [toolbar]);

  const tooltipText = (
    <span>
      Fits a label to a channel (<kbd>M</kbd>)
    </span>
  );

  return (
    <ActionButton
      {...rest}
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
