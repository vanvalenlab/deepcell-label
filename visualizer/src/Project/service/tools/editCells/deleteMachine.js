import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createDeleteMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('swap', () => context.eventBuses.select) },
        { src: fromEventBus('swap', () => context.eventBuses.overlaps) },
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
          { cond: 'shift', actions: 'selectCell' },
          { cond: 'onSelected', actions: 'delete' },
          { actions: 'selectCell' },
        ],
      },
    },
    {
      guards: {
        shift: (_, event) => event.shiftKey,
        onSelected: (ctx) => ctx.overlapMatrix[ctx.hovering][ctx.selected] === 1,
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setOverlapMatrix: assign({ overlapMatrix: (_, evt) => evt.overlapMatrix }),
        delete: send((ctx) => ({ type: 'DELETE', cell: ctx.selected }), { to: 'overlaps' }),
        selectCell: send('SELECT', { to: 'select' }),
      },
    }
  );
}

export default createDeleteMachine;
