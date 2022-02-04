import { Box } from '@mui/material';
import ExportQualityControlButton from './QualityControl/ExportQualityControlButton';
import ProjectSelect from './QualityControl/ProjectSelect';
import ReviewButtons from './QualityControl/ReviewButtons';

function QualityControl() {
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

export default QualityControl;
