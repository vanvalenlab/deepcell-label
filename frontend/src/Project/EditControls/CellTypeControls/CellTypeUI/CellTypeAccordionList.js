import { Box } from '@mui/material';
import equal from 'fast-deep-equal';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import CellTypeAccordion from './CellTypeAccordion';
import { useCellTypes, useCanvas } from '../../../ProjectContext';

const accordionStyle = {
    position: 'relative',
    top: 50,
    width: 300,
    margin: 'auto',
    overflow: 'hidden',
    overflowY: 'auto'
};

function CellTypeAccordionList() {

    const cellTypesRef = useCellTypes();
    const [expanded, setExpanded] = useState(-1);
    const canvasMachine = useCanvas();
    const [sh, scale] = useSelector(
        canvasMachine,
        (state) => [state.context.height, state.context.scale],
        equal
    );
    const cellTypes = useSelector(cellTypesRef, (state) => state.context.cellTypes);
    const feature = useSelector(cellTypesRef, (state) => state.context.feature);
   
    const menuHeight = scale * sh - 100;
    const currentCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);

    return (
        <Box 
            height={menuHeight}
            style={accordionStyle}
        >
            {currentCellTypes.map((cellType) => 
                <div key={cellType.id}>
                    <CellTypeAccordion
                        cellType={cellType}
                        expanded={expanded}
                        setExpanded={setExpanded}
                    />
                </div>
                )
            } 
        </Box>
    );
}

export default CellTypeAccordionList;
