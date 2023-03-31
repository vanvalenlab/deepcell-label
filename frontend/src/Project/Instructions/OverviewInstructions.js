import Typography from '@mui/material/Typography';
import React from 'react';

function OverviewInstructions() {
  return (
    <Typography component={'span'}>
      DeepCell Label annotates biological images by
      <ul>
        <li>segmenting cells</li>
        <li>assigning cells over time</li>
        <li>capturing cell divisions</li>
        <li>classifying cell types</li>
      </ul>
      Labeled data are shown on the canvas on the right, and controls are on the left (and for cell
      types, right).
      <br />
      On the far left, there is an export button and tabs to edit each label type. The tabs change
      which controls are shown in the next column to the right.
      <br /> On the top, there are controls for displaying the data.
    </Typography>
  );
}

export default OverviewInstructions;
