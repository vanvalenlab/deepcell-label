import Box from '@mui/material/Box';
import FrameModeButtons from './FrameModeButtons';
import ToolButtons from './ToolButtons';

function CellControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <FrameModeButtons />
      <ToolButtons />
    </Box>
  );
}

export default CellControls;
