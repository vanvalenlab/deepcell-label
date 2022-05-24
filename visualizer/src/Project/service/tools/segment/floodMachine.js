import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const creatFloodMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('flood', () => context.eventBuses.api) },
        { src: fromEventBus('flood', () => context.eventBuses.cells) },
        { src: fromEventBus('flood', () => context.eventBuses.image) },
      ],
      context: {
        x: null,
        y: null,
        floodingCell: context.selected,
        floodedCell: 0,
        hovering: null,
        cells: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        SELECTED: { actions: 'setFloodingCell' },
        HOVERING: { actions: 'setHovering' },
        CELL_MATRIX: { actions: 'setCellMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setFloodedCell' },
          { cond: 'onFloodedCell', actions: 'flood' },
          { actions: 'setFloodedCell' },
        ],
      },
    },
    {
      guards: {
        shift: (_, event) => event.shiftKey,
        onFloodedCell: ({ floodedCell, hovering, cellMatrix }) =>
          cellMatrix[hovering][floodedCell] === 1,
      },
      actions: {
        setFloodingCell: assign({ floodingCell: (_, { selected }) => selected }),
        setFloodedCell: assign({
          floodedCell: ({ hovering, cellMatrix, floodedCell }) => {
            const cells = cellMatrix[hovering];
            if (cells[floodedCell]) {
              // Get next cell that hovering value encodes
              const reordered = cells
                .slice(floodedCell + 1)
                .concat(cells.slice(0, floodedCell + 1));
              const nextCell = (reordered.findIndex((i) => !!i) + floodedCell + 1) % cells.length;
              return nextCell;
            }
            const firstCell = cells.findIndex((i) => i === 1);
            return firstCell === -1 ? 0 : firstCell;
          },
        }),
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setCellMatrix: assign({ cellMatrix: (_, { cellMatrix }) => cellMatrix }),
        flood: send(
          ({ floodingCell, floodedCell, x, y }, event) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              foreground: floodingCell,
              background: floodedCell,
              x,
              y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default creatFloodMachine;
