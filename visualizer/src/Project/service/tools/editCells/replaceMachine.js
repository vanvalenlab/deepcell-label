import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createReplaceMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('replace', () => context.eventBuses.select) },
        { id: 'overlaps', src: fromEventBus('replace', () => context.eventBuses.overlaps) },
      ],
      context: {
        selected: context.selected,
        replaceCell: 0,
        hovering: null,
        overlapMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        OVERLAP_MATRIX: { actions: 'setOverlapMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setReplaceCell' },
          { cond: 'onReplaceCell', actions: 'replace' },
          { actions: 'setReplaceCell' },
        ],
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onReplaceCell: (ctx) => ctx.overlapMatrix[ctx.hovering][ctx.replaceCell] === 1,
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setReplaceCell: assign({
          replaceCell: (ctx) => {
            const { hovering, replace: cell, overlapMatrix } = ctx;
            const cells = overlapMatrix[hovering];
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
        setOverlapMatrix: assign({ overlapMatrix: (_, evt) => evt.overlapMatrix }),
        replace: send((ctx, evt) => ({ type: 'REPLACE', a: ctx.selected, b: ctx.replaceCell }), {
          to: 'overlaps',
        }),
      },
    }
  );
}

export default createReplaceMachine;
