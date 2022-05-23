import Box from '@mui/material/Box';
import FrameSlider from '../../FrameSlider';
import Cells from './Cells';
import FrameModeButtons from './FrameModeButtons';
import ToolButtons from './ToolButtons';

function CellControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <FrameSlider />
      <Cells />
      <FrameModeButtons />
      <ToolButtons />
    </Box>
  );
}

export default CellControls;
