import Box from '@material-ui/core/Box';
import { useLabeled } from '../ProjectContext';
import FrameSlider from './FrameSlider';
import ActionButtons from './Segment/ActionButtons';
import SelectedPalette from './Segment/SelectedPalette';
import ToolButtons from './Segment/ToolButtons';
import UndoRedo from './Segment/UndoRedo';

function SegmentControls() {
  const labeled = useLabeled();
  return (
    <Box display='flex' flexDirection='column'>
      <UndoRedo />
      <FrameSlider />
      <Box display='flex' flexDirection='row'>
        <Box display='flex' flexDirection='column'>
          <ToolButtons />
          <ActionButtons />
        </Box>
        {labeled && <SelectedPalette />}
      </Box>
    </Box>
  );
}

export default SegmentControls;
