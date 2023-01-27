// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, FormLabel, Button } from '@mui/material';
import AddCellTypeLabel from './CellTypeUI/AddCellTypeLabel';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';

function CellTypeControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel sx={{ marginBottom: 2 }}>
        Cell Type Labels
        <Button
          variant='contained'
          disableElevation
          disableRipple
          style={{ borderRadius: 100 }}
          color='secondary'
          sx={{ width: 5, height: 20, top: -1, marginLeft: 1 }}
        >
          {' '}
          Beta
        </Button>
      </FormLabel>
      <AddCellTypeLabel />
      <CellTypeAccordionList />
      <EditingPrompt />
    </Box>
  );
}

export default CellTypeControls;
