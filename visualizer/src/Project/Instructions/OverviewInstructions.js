import Typography from '@mui/material/Typography';
import React from 'react';

function OverviewInstructions() {
  return (
    <Typography>
      DeepCell Label is a web-based tool for labeling biological images that can segment cells,
      assign cells over time, and curate cell divisions. The labeled data are shown on the canvas on
      the right, and controls are on the left.
      <br />
      In the far left column, there is an export button, tabs for editing different types of labels,
      and controls for for displaying the labeled data. The tabs change which controls to edit the
      labels are shown in the next column to the right.
      <br />
      The interactive canvas overlays labels on an image. YOu
    </Typography>
  );
}

export default OverviewInstructions;
