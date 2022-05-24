import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createSwapMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('flood', () => context.eventBuses.cells) },
      ],
      context: {
        selected: context.selected,
        swapCell: null,
        hovering: null,
        cellMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        CELL_MATRIX: { actions: 'setCellMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setSwapCell' },
          { cond: 'onSwapCell', actions: 'swap' },
          { cond: 'onSelected', actions: 'swap' },
          { actions: 'setSwapCell' },
        ],
        EXIT: { actions: 'resetSwapCell' },
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onSwapCell: (ctx) => ctx.swapCell && ctx.cellMatrix[ctx.hovering][ctx.swapCell] === 1,
        onSelected: (ctx) => ctx.cellMatrix[ctx.hovering][ctx.selected] === 1,
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setSwapCell: assign({
          swapCell: (ctx) => {
            const { hovering, swapCell: cell, cellMatrix } = ctx;
            const cells = cellMatrix[hovering];
            if (cells[cell]) {
              // Get next label that hovering value encodes
              const reordered = cells.slice(cell + 1).concat(cells.slice(0, cell + 1));
              const nextCell = (reordered.findIndex((i) => !!i) + cell + 1) % cells.length;
              return nextCell;
            }
            const firstCell = cells.findIndex((i) => i === 1);
            return firstCell === -1 ? 0 : firstCell;
          },
        }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setCellMatrix: assign({ cellMatrix: (_, evt) => evt.cellMatrix }),
        swap: send((ctx) => ({ type: 'SWAP', a: ctx.selected, b: ctx.swapCell }), {
          to: 'cells',
        }),
      },
    }
  );
}

export default createSwapMachine;
