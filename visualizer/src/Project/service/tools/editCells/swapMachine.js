import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createSwapMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { src: fromEventBus('flood', () => context.eventBuses.overlaps) },
      ],
      context: {
        selected: context.selected,
        swapCell: 0,
        hovering: null,
        overlapMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        OVERLAP_MATRIX: { actions: 'setOverlapMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setSwapCell' },
          { cond: 'onSwapCell', actions: 'swap' },
          { actions: 'setSwapCell' },
        ],
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onSwapCell: (ctx) => ctx.overlapMatrix[ctx.hovering][ctx.swapCell] === 1,
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setSwapCell: assign({
          swapCell: ({ hovering, overlapMatrix, swapCell }) => {
            const cells = overlapMatrix[hovering];
            if (cells[swapCell]) {
              // Get next label that hovering value encodes
              const reordered = cells.slice(swapCell + 1).concat(cells.slice(0, swapCell + 1));
              const nextCell = (reordered.findIndex((i) => !!i) + swapCell + 1) % cells.length;
              return nextCell;
            }
            const firstCell = cells.findIndex((i) => i === 1);
            return firstCell === -1 ? 0 : firstCell;
          },
        }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setOverlapMatrix: assign({ overlapMatrix: (_, evt) => evt.overlapMatrix }),
        swap: send(
          (ctx, evt) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              a: ctx.selected,
              b: ctx.swapCell,
            },
          }),
          { to: 'overlaps' }
        ),
      },
    }
  );
}

export default createSwapMachine;
