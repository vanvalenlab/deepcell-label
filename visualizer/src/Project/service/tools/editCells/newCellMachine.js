import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createNewCellMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('delete', () => context.eventBuses.select) },
        { id: 'overlaps', src: fromEventBus('delete', () => context.eventBuses.overlaps) },
      ],
      context: {
        selected: context.selected,
        hovering: null,
        overlapMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        OVERLAP_MATRIX: { actions: 'setOverlapMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'selectCell' },
          { cond: 'onSelected', actions: 'newCell' },
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
        newCell: send((ctx) => ({ type: 'NEW', cell: ctx.selected }), { to: 'overlaps' }),
        selectCell: send('SELECT', { to: 'select' }),
      },
    }
  );
}

export default createNewCellMachine;
