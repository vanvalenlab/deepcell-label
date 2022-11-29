// Controls for cell types menu, including button for adding cell type,
// the list of cell types, and an editing prompt when adding cells

import { Box, FormLabel, Button } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import AddCellTypeLabel from './CellTypeUI/AddCellTypeLabel';
import CellTypeAccordionList from './CellTypeUI/CellTypeAccordionList';
import EditingPrompt from './CellTypeUI/EditingPrompt';
import ToggleAll from './CellTypeUI/ToggleAll';
import { useCellTypes } from '../../ProjectContext';

function CellTypeControls() {

    const cellTypes = useCellTypes();
    const isOnArray = useSelector(cellTypes, (state) => state.context.isOn);
    const [toggleArray, setToggleArray] = useState(isOnArray);

    return (
        <Box display='flex' flexDirection='column'> 
            <FormLabel sx={{marginBottom: 2}}>
            Cell Type Labels 
                <Button 
                  variant='contained'
                  disableElevation
                  disableRipple
                  style={{borderRadius: 100,}}
                  color='secondary'
                  sx={{width: 5,
                      height: 20,
                      top: -1,
                      marginLeft: 1,}}
                > Alpha
                </Button>
            </FormLabel>
            <AddCellTypeLabel toggleArray={toggleArray} setToggleArray={setToggleArray} />
            <ToggleAll toggleArray={toggleArray} setToggleArray={setToggleArray} />
            <CellTypeAccordionList toggleArray={toggleArray} setToggleArray={setToggleArray} />
			<EditingPrompt/>
        </Box>
  );
}

export default CellTypeControls;
