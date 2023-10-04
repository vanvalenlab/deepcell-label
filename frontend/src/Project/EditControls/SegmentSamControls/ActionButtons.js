import { FormLabel } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import SegmentAllButton from './ActionButtons/SegmentAllButton';

function ActionButtons() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Actions</FormLabel>
      <ButtonGroup orientation='vertical'>
        <SegmentAllButton />
      </ButtonGroup>
    </Box>
  );
}

export default ActionButtons;
