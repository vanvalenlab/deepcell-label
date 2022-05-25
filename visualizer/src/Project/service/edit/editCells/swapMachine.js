import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createSwapMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('flood', () => context.eventBuses.cells) },
        { src: fromEventBus('flood', () => context.eventBuses.hovering) },
      ],
      context: {
        selected: context.selected,
        swapCell: null,
        hovering: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
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
        onSwapCell: (ctx) => ctx.hovering.includes(ctx.swapCell),
        onSelected: (ctx) => ctx.hovering.includes(ctx.selected),
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setSwapCell: assign({
          swapCell: (ctx) => {
            const { hovering, swapCell } = ctx;
            const i = hovering.indexOf(swapCell);
            return i === -1 || i === hovering.length - 1 ? hovering[0] : hovering[i + 1];
          },
        }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        swap: send((ctx) => ({ type: 'SWAP', a: ctx.selected, b: ctx.swapCell }), {
          to: 'cells',
        }),
      },
    }
  );
}

export default createSwapMachine;
