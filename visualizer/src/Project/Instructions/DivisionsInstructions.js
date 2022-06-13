import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';

function DivisionsInstructions() {
  return (
    <Box>
      <Typography>Capture parent-daughter relationships with the Divisions tab.</Typography>
      <Typography>
        The tab shows divisions both where the selected cell is a parent cell and a daughter cell.
      </Typography>
      <br />
      <Typography variant='h5'>Editing a Division</Typography>
      <Typography>
        Daughter cells have an X to their right to removes the daughter from the division.
        <br />
        Divisions have + symbol to add daughters. After pressing +, click a cell on the canvas to
        select it, and then click the cell again to confirm and add the daughter to the division.
      </Typography>
      <br />
      <Typography variant='h5'>Warnings</Typography>
      <Typography>
        Alerts show issues that may be present in the division labels. Warnings show issues that may
        be valid, while red errors must be corrected.
      </Typography>
      <Typography variant='h6'>One Daughter Warning</Typography>
      <Typography>
        Shown when a cell divides into only one daughter cell. When a division occurs on the edge of
        the movie, the second daughter may be off screen. Otherwise, the parent and daughter should
        be combined with Replace in the cells tab.
      </Typography>
      <Typography variant='h6'>Parent After Division Error</Typography>
      <Typography>
        Shown when a parent cell appears after a division. The parent cell may need to be removed
        after the division, or the division may need to be recreated at a later time.
      </Typography>
      <Typography variant='h6'>Daughter Before Division Error</Typography>
      <Typography>
        Shown when a daughter cell appears before a division. The cell may need to be removed before
        the division, or the division may need to be recreated at an earlier time.
      </Typography>
      <Typography variant='h6'>Daughter in Multiple Divisions Error</Typography>
      <Typography>This is shown when a cell appears as a parent in multiple divisions.</Typography>
      <Typography variant='h6'>Parent in Multiple Divisions Error</Typography>
      <Typography>
        Shown when a cell appears as a parent in multiple divisions. The cell label may appear in
        multiple places and need to be split into separate cells with the Flood tool in the Segment
        tab.
      </Typography>
      <Typography variant='h6'>Daughter in Multiple Divisions Error</Typography>
      <Typography>
        Shown when a cell appears as a parent in multiple divisions. The cell label may appear in
        multiple places and need to be split into separate cell with the Flood tool in the Segment
        tab.
      </Typography>
    </Box>
  );
}

export default DivisionsInstructions;
