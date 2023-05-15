// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, FormLabel } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes } from '../../ProjectContext';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';
import ToggleAll from './CellTypeUI/ToggleAll';
import ToolBar from './CellTypeUI/ToolBar';

function CellTypeControls() {
  const cellTypes = useCellTypes();
  const isOnArray = useSelector(cellTypes, (state) => state.context.isOn);
  const [toggleArray, setToggleArray] = useState(isOnArray);

  return (
    <Box id='cell-type-controls' display='flex' flexDirection='column'>
      <FormLabel sx={{ marginBottom: 1 }}>Cell Type Controls</FormLabel>
      <ToolBar sx={{ marginBottom: 1 }} toggleArray={toggleArray} setToggleArray={setToggleArray} />
      <Box sx={{ marginLeft: 0.85 }} display='flex' flexDirection='row'>
        <ToggleAll toggleArray={toggleArray} setToggleArray={setToggleArray} />
      </Box>
      <CellTypeAccordionList toggleArray={toggleArray} setToggleArray={setToggleArray} />
      <EditingPrompt />
    </Box>
  );
}

export default CellTypeControls;
