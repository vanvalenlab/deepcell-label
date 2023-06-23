// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, FormLabel, Grid } from '@mui/material';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';
import ToggleAll from './CellTypeUI/ToggleAll';
import ToggleAnimation from './CellTypeUI/ToggleAnimation';
import ToolBar from './CellTypeUI/ToolBar';

function CellTypeControls() {
  return (
    <Box id='cell-type-controls' display='flex' flexDirection='column'>
      <FormLabel sx={{ marginBottom: 1 }}>Cell Type Controls</FormLabel>
      <ToolBar sx={{ marginBottom: 1 }} />
      <Grid container sx={{ marginLeft: 0.85 }}>
        <ToggleAll />
        <ToggleAnimation />
      </Grid>
      <CellTypeAccordionList />
      <EditingPrompt />
    </Box>
  );
}

export default CellTypeControls;
