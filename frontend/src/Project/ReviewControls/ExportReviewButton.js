import GetAppIcon from '@mui/icons-material/GetApp';
import { Button } from '@mui/material';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useReview } from '../ReviewContext';

function download(judgments) {
  const a = document.createElement('a');
  const csvContent =
    'data:text/csv,' +
    encodeURI(
      Object.entries(judgments)
        .map((e) => e.join(','))
        .join('\n')
    );
  a.href = csvContent;
  a.setAttribute('download', 'review.csv');
  a.click();
}

function ExportReviewButton() {
  const review = useReview();
  const judgments = useSelector(review, (state) => state.context.judgments);
  // { 'EXAMPLE_ID': true, 'OTHER_ID': false }

  return (
    <Button
      type='submit'
      variant='contained'
      color='primary'
      endIcon={<GetAppIcon />}
      onClick={() => download(judgments)}
    >
      Download QC
    </Button>
  );
}

export default ExportReviewButton;
