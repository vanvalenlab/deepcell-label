import Box from '@mui/material/Box';
import FrameSlider from '../../FrameSlider';
import ActionButtons from './ActionButtons';
import SelectedPalette from './SelectedPalette';
import ToolButtons from './ToolButtons';
import UndoRedo from './UndoRedo';

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
