// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, Chip, FormLabel } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes } from '../../ProjectContext';
import AddCellTypeLabel from './CellTypeUI/AddCellTypeLabel';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';
import OpenMarkerPanel from './CellTypeUI/OpenMarkerPanel';
import ToggleAll from './CellTypeUI/ToggleAll';

function CellTypeControls() {
  const cellTypes = useCellTypes();
  const isOnArray = useSelector(cellTypes, (state) => state.context.isOn);
  const [toggleArray, setToggleArray] = useState(isOnArray);

  return (
    <Box id='cell-type-controls' display='flex' flexDirection='column'>
      <FormLabel sx={{ marginBottom: 2 }}>
        Cell Type Labels
        <Chip
          label={'ALPHA'}
          size='small'
          sx={{
            marginLeft: 1,
            fontWeight: 500,
            backgroundColor: 'rgba(150,30,190,1)',
            color: 'rgba(255,255,255,1)',
          }}
        />
      </FormLabel>
      <AddCellTypeLabel toggleArray={toggleArray} setToggleArray={setToggleArray} />
      <Box
        sx={{ position: 'relative', top: 50, marginLeft: 0.85 }}
        display='flex'
        flexDirection='row'
      >
        <ToggleAll toggleArray={toggleArray} setToggleArray={setToggleArray} />
        <OpenMarkerPanel />
      </Box>
      <CellTypeAccordionList toggleArray={toggleArray} setToggleArray={setToggleArray} />
      <EditingPrompt />
    </Box>
  );
}

export default CellTypeControls;
