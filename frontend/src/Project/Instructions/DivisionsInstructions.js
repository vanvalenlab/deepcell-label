import { Box, Grid } from '@mui/material';
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
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant='h5'>Alerts</Typography>
          <Typography>
            Alerts show issues that may be present in the division labels. Warnings show issues that
            may be valid, while red errors must be corrected.
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant='h6'>One Daughter Warning</Typography>
        </Grid>
        <Grid item xs={9}>
          <Typography>
            Shown when a cell divides into only one daughter cell.
            <br />
            <strong>Dismiss:</strong> If the division is on the edge, the second daughter may be off
            screen.
            <br />
            <strong>Fix:</strong> Combine the parent and daughter with Combine in the Cells tab.
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant='h6'>Parent After Division Error</Typography>
        </Grid>
        <Grid item xs={9}>
          <Typography>
            Shown when a parent cell appears after a division.
            <br />
            <strong>Fix:</strong> Remove the parent cell after the division.
            <br />
            <strong>Fix:</strong> Recreate the division at a later time.
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant='h6'>Daughter Before Division Error</Typography>
        </Grid>
        <Grid item xs={9}>
          <Typography>
            Shown when a daughter cell appears before a division.
            <br />
            <strong>Fix:</strong> Remove the daughter cell before the division.
            <br />
            <strong>Fix:</strong> Recreate the division at an earlier time.
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant='h6'>Parent in Multiple Divisions Error</Typography>
        </Grid>
        <Grid item xs={9}>
          <Typography>
            Shown when a cell appears as a parent in multiple divisions.
            <br />
            <strong>Fix:</strong> If the cell appears in multiple places, split it into separate
            cells with Flood.
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant='h6'>Daughter in Multiple Divisions Error</Typography>
        </Grid>
        <Grid item xs={9}>
          <Typography>
            Shown when a cell appears as a parent in multiple divisions.
            <br />
            <strong>Fix:</strong> If the cell appears in multiple places, split it into separate
            cells with Flood.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DivisionsInstructions;
