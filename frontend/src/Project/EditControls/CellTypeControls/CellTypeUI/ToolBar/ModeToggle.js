import LayersClearTwoToneIcon from '@mui/icons-material/LayersClearTwoTone';
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import React, { useCallback, useEffect } from 'react';
import { useEditCellTypes } from '../../../../ProjectContext';

function ModeToggle() {
  const editCellTypes = useEditCellTypes();
  const mode = useSelector(editCellTypes, (state) => state.context.mode);
  const handleMode = useCallback(() => {
    editCellTypes.send({
      type: 'SET_MODE',
      mode: mode === 'overwrite' ? 'multiLabel' : 'overwrite',
    });
  }, [editCellTypes, mode]);

  useEffect(() => {
    bind('m', handleMode);
    return () => {
      unbind('m', handleMode);
    };
  }, [handleMode]);

  return (
    <Tooltip
      title={
        mode === 'overwrite' ? (
          <span>
            Overwrite Mode <kbd>M</kbd>
          </span>
        ) : (
          <span>
            Multi-Label Mode <kbd>M</kbd>
          </span>
        )
      }
      placement='top'
    >
      <IconButton onClick={handleMode} color='primary' sx={{ width: '100%', borderRadius: 1 }}>
        {mode === 'overwrite' ? <LayersClearTwoToneIcon /> : <LayersTwoToneIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ModeToggle;
