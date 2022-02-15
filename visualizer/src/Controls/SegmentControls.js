import Box from '@mui/material/Box';
import FrameSlider from './FrameSlider';
import ActionButtons from './Segment/ActionButtons';
import SelectedPalette from './Segment/SelectedPalette';
import ToolButtons from './Segment/ToolButtons';
import UndoRedo from './Segment/UndoRedo';

function SegmentControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <UndoRedo />
      <FrameSlider />
      <Box display='flex' flexDirection='row'>
        <Box display='flex' flexDirection='column'>
          <ToolButtons />
          <ActionButtons />
        </Box>
        <SelectedPalette />
      </Box>
    </Box>
  );
}

export default SegmentControls;
