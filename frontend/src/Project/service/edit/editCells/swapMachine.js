/** Manages using the swap tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createSwapMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('swap', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('swap', () => context.eventBuses.hovering, 'HOVERING') },
        { id: 'cells', src: fromEventBus('swap', () => context.eventBuses.cells) },
      ],
      entry: send('GET_SELECTED', { to: 'select' }),
      context: {
        selected: null,
        swapCell: null,
        hovering: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          { cond: 'noneSelected', actions: 'select' },
          { cond: 'shift', actions: 'setSwapCell' },
          { cond: 'onSwapCell', actions: 'swap' },
          { cond: 'onSelected', actions: 'swap' },
          { actions: 'setSwapCell' },
        ],
        ENTER: { cond: 'haveCells', actions: 'swap' },
        EXIT: { actions: 'resetSwapCell' },
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        noneSelected: (ctx) => !ctx.selected,
        onSwapCell: (ctx) => ctx.hovering.includes(ctx.swapCell),
        onSelected: (ctx) => ctx.hovering.includes(ctx.selected),
        haveCells: (ctx) => !!ctx.replaceCell && !!ctx.selected,
      },
      actions: {
        select: send('SELECT', { to: 'select' }),
        setSelected: assign({
          selected: (_, evt) => evt.selected,
          swapCell: (ctx, evt) => (evt.selected === ctx.swapCell ? null : ctx.swapCell),
        }),
        resetSwapCell: assign({ swapCell: null }),
        setSwapCell: assign({
          swapCell: (ctx) => {
            const { hovering, swapCell, selected } = ctx;
            const i = hovering.indexOf(swapCell);
            const next = i + 1 < hovering.length ? hovering[i + 1] : hovering[0];
            const nextNext = i + 2 < hovering.length ? hovering[i + 2] : swapCell;
            return next === selected ? nextNext : next;
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
