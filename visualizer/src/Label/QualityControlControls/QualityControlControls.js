import { Box } from '@mui/material';
import ExportQualityControlButton from './ExportQualityControlButton';
import ProjectSelect from './ProjectSelect';
import ReviewButtons from './ReviewButtons';

function QualityControlControls() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 1,
      }}
    >
      <ProjectSelect />
      <ReviewButtons />
      <ExportQualityControlButton />
    </Box>
  );
}

export default QualityControlControls;
