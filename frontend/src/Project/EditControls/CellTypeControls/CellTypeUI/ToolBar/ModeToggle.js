import LayersClearTwoToneIcon from '@mui/icons-material/LayersClearTwoTone';
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../../../ProjectContext';

function ModeToggle() {
  const editCellTypes = useEditCellTypes();
  const mode = useSelector(editCellTypes, (state) => state.context.mode);
  const handleMode = () => {
    editCellTypes.send({
      type: 'SET_MODE',
      mode: mode === 'overwrite' ? 'multiLabel' : 'overwrite',
    });
  };

  return (
    <Tooltip title={mode === 'overwrite' ? 'Overwrite Mode' : 'Multi-Label Mode'}>
      <IconButton onClick={handleMode} color='primary' sx={{ width: '100%', borderRadius: 1 }}>
        {mode === 'overwrite' ? <LayersClearTwoToneIcon /> : <LayersTwoToneIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ModeToggle;
