import { Box } from '@mui/material';
import ExportReviewButton from './ExportReviewButton';
import ProjectSelect from './ProjectSelect';
import ReviewButtons from './ReviewButtons';

function ReviewControls() {
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
      <ExportReviewButton />
    </Box>
  );
}

export default ReviewControls;
