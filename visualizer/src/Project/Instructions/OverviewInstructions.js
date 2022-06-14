import Typography from '@mui/material/Typography';
import React from 'react';

function OverviewInstructions() {
  return (
    <Typography>
      DeepCell Label annotates biological images by
      <ul>
        <li>segmenting cells</li>
        <li>assigning cells over time</li>
        <li>capturing cell divisions</li>
      </ul>
      Labeled data are shown on the canvas on the right, and controls are on the left.
      <br />
      On the far left, there is an export button, tabs to edit each label type, and controls to
      display the labeled data. The tabs change which controls are shown in the next column to the
      right.
    </Typography>
  );
}

export default OverviewInstructions;
