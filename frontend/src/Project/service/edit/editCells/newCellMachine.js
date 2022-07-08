/** Manages using the new cell tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createNewCellMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('newCell', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('newCell', () => context.eventBuses.hovering, 'HOVERING') },
        { id: 'cells', src: fromEventBus('newCell', () => context.eventBuses.cells) },
      ],
      context: {
        selected: null,
        hovering: null,
      },
      entry: send('GET_SELECTED', { to: 'select' }),
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          { cond: 'shift', actions: 'selectCell' },
          { cond: 'onSelected', actions: 'newCell' },
          { actions: 'selectCell' },
        ],
        ENTER: { cond: 'haveSelected', actions: 'newCell' },
      },
    },
    {
      guards: {
        haveSelected: (ctx) => !!ctx.selected,
        shift: (_, event) => event.shiftKey,
        onSelected: (ctx) => ctx.hovering.includes(ctx.selected),
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        newCell: send((ctx) => ({ type: 'NEW_CELL', cell: ctx.selected }), { to: 'cells' }),
        selectCell: send('SELECT', { to: 'select' }),
      },
    }
  );
}

export default createNewCellMachine;
