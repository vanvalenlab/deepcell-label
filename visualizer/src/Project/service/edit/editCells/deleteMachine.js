import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createDeleteMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('delete', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('delete', () => context.eventBuses.cells) },
        { src: fromEventBus('delete', () => context.eventBuses.hovering) },
      ],
      context: {
        selected: context.selected,
        hovering: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
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
        onSelected: (ctx) => ctx.hovering.includes(ctx.selected),
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        delete: send((ctx) => ({ type: 'DELETE', cell: ctx.selected }), { to: 'cells' }),
        selectCell: send('SELECT', { to: 'select' }),
      },
    }
  );
}

export default createDeleteMachine;