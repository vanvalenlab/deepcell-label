// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, FormLabel } from '@mui/material';
import { useCellTypes } from '../../ProjectContext';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';
import ToggleAll from './CellTypeUI/ToggleAll';
import ToolBar from './CellTypeUI/ToolBar';

function CellTypeControls() {
  const cellTypes = useCellTypes();

  return (
    <Box id='cell-type-controls' display='flex' flexDirection='column'>
      <FormLabel sx={{ marginBottom: 1 }}>Cell Type Controls</FormLabel>
      <ToolBar sx={{ marginBottom: 1 }} />
      <Box sx={{ marginLeft: 0.85 }} display='flex' flexDirection='row'>
        <ToggleAll />
      </Box>
      <CellTypeAccordionList />
      <EditingPrompt />
    </Box>
  );
}

export default CellTypeControls;
