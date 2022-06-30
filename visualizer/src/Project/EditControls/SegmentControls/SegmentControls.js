import Box from '@mui/material/Box';
import ActionButtons from './ActionButtons';
import ToolButtons from './ToolButtons';
import WriteModeButtons from './WriteModeButtons';

function SegmentControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <WriteModeButtons />
      <ToolButtons />
      <ActionButtons />
    </Box>
  );
}

export default SegmentControls;
