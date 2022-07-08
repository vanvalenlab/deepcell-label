import { Box, FormLabel, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import React from 'react';
import Hovering from '../DisplayControls/Cells/Hovering';
import NewCellButton from '../DisplayControls/Cells/Selected/NewCellButton';
import NextCellButton from '../DisplayControls/Cells/Selected/NextCellButton';
import PreviousCellButton from '../DisplayControls/Cells/Selected/PreviousCellButton';
import ResetCellButton from '../DisplayControls/Cells/Selected/ResetCellButton';
import Selected from '../DisplayControls/Cells/Selected/Selected';
import HighlightToggle from '../DisplayControls/LabeledControls/HighlightToggle';
import TimeControls from '../DisplayControls/TimeControls';
import { useImage } from '../ProjectContext';
import { Shortcut, Shortcuts } from './Shortcuts';

function SelectShortcuts() {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  return (
    <Shortcuts>
      {duration > 1 && <Shortcut text='Previous time' shortcut='A' />}
      {duration > 1 && <Shortcut text='Next time' shortcut='D' />}
      <Shortcut text='Toggle highlight' shortcut='H' />
      <Shortcut text='Select new label' shortcut='N' />
      <Shortcut text='Reset selected label ' shortcut='Esc' />
      <Shortcut text='Select previous label' shortcut='[' />
      <Shortcut text='Select next label' shortcut=']' />
    </Shortcuts>
  );
}

function SelectInstructions() {
  const image = useImage();
  const duration = useSelector(image, (state) => state.context.duration);

  const width = '150px';
  return (
    <Box display='flex' justifyContent='space-between'>
      <div>
        <Grid container spacing={1}>
          {duration > 1 && (
            <Grid container item>
              <Box sx={{ width }}>
                <TimeControls />
              </Box>
              <Typography sx={{ pl: 1, flex: '1 0 0' }}>
                Move between frames in a timelapse with this slider. Below is a timeline of which
                when the selected and hovering cells are present.
              </Typography>
            </Grid>
          )}
          <Grid container item>
            <Box sx={{ width }}>
              <HighlightToggle />
            </Box>
            <Typography component={'span'} sx={{ pl: 1, flex: '1 0 0' }}>
              Toggles whether to show the selected cell in red on the canvas.
            </Typography>
          </Grid>
          <Grid container item>
            <Box sx={{ width }}>
              <Selected />
            </Box>
            <Typography component={'span'} sx={{ pl: 1, flex: '1 0 0' }}>
              Shows the selected cell. Hover for controls to change the cell. <PreviousCellButton />{' '}
              and <NextCellButton /> cycle the cell, <NewCellButton />
              selects a new cell, and <ResetCellButton /> resets the cell.
            </Typography>
          </Grid>
          <Grid container item>
            <Box sx={{ width }} display='flex' flexDirection='column'>
              <FormLabel>Hovering</FormLabel>
              <Hovering />
            </Box>
            <Typography sx={{ pl: 1, flex: '1 0 0' }}>
              Hover over cells on the canvas to see which cell it is.
            </Typography>
          </Grid>
        </Grid>
      </div>
      <SelectShortcuts />
    </Box>
  );
}

export default SelectInstructions;
