import { Box } from '@mui/material';
import equal from 'fast-deep-equal';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import CellTypeAccordion from './CellTypeAccordion';
import { useCellTypeList, useCanvas } from '../../../ProjectContext';

const accordionStyle = {
    position: 'relative',
    top: 50,
    width: 300,
    margin: 'auto',
    overflow: 'hidden',
    overflowY: 'auto'
};

function CellTypeLabelList() {

	const cellTypes = useCellTypeList();
    const [expanded, setExpanded] = useState(-1);
    const canvasMachine = useCanvas();
    const [sh, scale] = useSelector(
        canvasMachine,
        (state) => [state.context.height, state.context.scale],
        equal
    );
    const menuHeight = scale * sh - 100;

    return (
        <Box 
            height={menuHeight}
            style={accordionStyle}
        >
            {cellTypes.map((cellType) => 
                <div key={cellType.id}>
                    <CellTypeAccordion
                        cellType={cellType}
                        expanded={expanded}
                        setExpanded={setExpanded}
                    />
                </div>)
            }
        </Box>
    );
}

export default CellTypeLabelList;
