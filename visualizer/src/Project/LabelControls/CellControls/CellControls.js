import Box from '@mui/material/Box';
import FrameSlider from '../../FrameSlider';
import FrameModeButtons from './FrameModeButtons';
import ToolButtons from './ToolButtons';

function CellControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <FrameSlider />
      <FrameModeButtons />
      <ToolButtons />
    </Box>
  );
}

export default CellControls;
