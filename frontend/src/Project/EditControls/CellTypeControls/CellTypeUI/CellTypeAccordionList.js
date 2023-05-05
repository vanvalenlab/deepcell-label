import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { useState } from 'react';
import { useCanvas, useCellTypes } from '../../../ProjectContext';
import CellTypeAccordion from './CellTypeAccordion/CellTypeAccordion';

const accordionStyle = {
  position: 'relative',
  top: 50,
  width: 300,
  margin: 'auto',
  overflow: 'hidden',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 10,
    backgroundColor: 'rgba(100,100,100,0.5)',
  },
};

function CellTypeAccordionList(props) {
  const { toggleArray, setToggleArray } = props;
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
    <Box height={menuHeight} sx={accordionStyle}>
      {currentCellTypes.map((cellType) => (
        <div key={cellType.id}>
          <CellTypeAccordion
            cellType={cellType}
            expanded={expanded}
            setExpanded={setExpanded}
            toggleArray={toggleArray}
            setToggleArray={setToggleArray}
          />
        </div>
      ))}
    </Box>
  );
}

export default CellTypeAccordionList;
