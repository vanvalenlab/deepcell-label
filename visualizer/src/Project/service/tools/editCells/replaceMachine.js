import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createReplaceMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('replace', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('replace', () => context.eventBuses.cells) },
      ],
      context: {
        selected: context.selected,
        replaceCell: null,
        hovering: null,
        cellMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        CELL_MATRIX: { actions: 'setCellMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setReplaceCell' },
          { cond: 'onReplaceCell', actions: 'replace' },
          { actions: 'setReplaceCell' },
        ],
        EXIT: { actions: 'resetReplaceCell' },
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onReplaceCell: (ctx) =>
          ctx.replaceCell && ctx.cellMatrix[ctx.hovering][ctx.replaceCell] === 1,
      },
      actions: {
        resetReplaceCell: assign({ replaceCell: null }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setReplaceCell: assign({
          replaceCell: (ctx) => {
            const { hovering, replaceCell: cell, cellMatrix } = ctx;
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
        replace: send((ctx, evt) => ({ type: 'REPLACE', a: ctx.selected, b: ctx.replaceCell }), {
          to: 'cells',
        }),
      },
    }
  );
}

export default createReplaceMachine;
