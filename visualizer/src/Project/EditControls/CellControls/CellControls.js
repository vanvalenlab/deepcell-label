import Box from '@mui/material/Box';
import ModeButtons from './ModeButtons';
import ToolButtons from './ToolButtons';

function CellControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <ModeButtons />
      <ToolButtons />
    </Box>
  );
}

export default CellControls;
