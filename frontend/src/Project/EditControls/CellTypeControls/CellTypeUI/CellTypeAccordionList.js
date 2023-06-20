import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useCanvas, useCellTypes } from '../../../ProjectContext';
import CellTypeAccordion from './CellTypeAccordion/CellTypeAccordion';

const accordionStyle = {
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

function CellTypeAccordionList() {
  const cellTypesRef = useCellTypes();
  const canvasMachine = useCanvas();
  const [sh, scale] = useSelector(
    canvasMachine,
    (state) => [state.context.height, state.context.scale],
    equal
  );
  const cellTypes = useSelector(cellTypesRef, (state) => state.context.cellTypes);
  const feature = useSelector(cellTypesRef, (state) => state.context.feature);
  const currentCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);

  const menuHeight = scale * sh - 100;

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    cellTypesRef.send({
      type: 'REORDER',
      source: result.source.index,
      destination: result.destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId='droppable'>
        {(provided, snapshot) => (
          <Box
            {...provided.droppableProps}
            ref={provided.innerRef}
            height={menuHeight}
            sx={accordionStyle}
          >
            {currentCellTypes.map((cellType, index) => (
              <Draggable key={cellType.id} draggableId={cellType.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <CellTypeAccordion cellType={cellType} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default CellTypeAccordionList;
