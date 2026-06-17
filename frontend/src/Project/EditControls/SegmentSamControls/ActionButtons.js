import { useSelector } from '@xstate/react';
import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import SegmentAllButton from './ActionButtons/SegmentAllButton';
import { useRaw } from '../../ProjectContext';

function ActionButtons() {
  const raw = useRaw();
  const layers = useSelector(raw, (state) => state.context.layers);
  const layer = layers[0];
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Actions</FormLabel>
      <ButtonGroup orientation='vertical'>
        <SegmentAllButton layer={layer} />
      </ButtonGroup>
    </Box>
  );
}

export default ActionButtons;
