import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createDeleteMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('delete', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('delete', () => context.eventBuses.cells) },
      ],
      context: {
        selected: context.selected,
        hovering: null,
        cellMatrix: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        CELL_MATRIX: { actions: 'setCellMatrix' },
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
        onSelected: (ctx) => ctx.cellMatrix[ctx.hovering][ctx.selected] === 1,
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setCellMatrix: assign({ cellMatrix: (_, evt) => evt.cellMatrix }),
        delete: send((ctx) => ({ type: 'DELETE', cell: ctx.selected }), { to: 'cells' }),
        selectCell: send('SELECT', { to: 'select' }),
      },
    }
  );
}

export default createDeleteMachine;
