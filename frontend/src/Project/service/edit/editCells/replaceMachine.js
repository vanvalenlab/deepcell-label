/** Manages using the replace tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createReplaceMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('replace', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('replace', () => context.eventBuses.hovering, 'HOVERING') },
        { id: 'cells', src: fromEventBus('replace', () => context.eventBuses.cells) },
      ],
      context: {
        selected: null,
        replaceCell: null,
        hovering: null,
      },
      entry: send('GET_SELECTED', { to: 'select' }),
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          { cond: 'noneSelected', actions: 'select' },
          { cond: 'shift', actions: 'setReplaceCell' },
          { cond: 'onReplaceCell', actions: 'replace' },
          { actions: 'setReplaceCell' },
        ],
        ENTER: { cond: 'haveCells', actions: 'replace' },
        EXIT: { actions: 'resetReplaceCell' },
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        noneSelected: (ctx) => !ctx.selected,
        onReplaceCell: (ctx) => ctx.hovering.includes(ctx.replaceCell),
        haveCells: (ctx) => !!ctx.replaceCell && !!ctx.selected,
      },
      actions: {
        resetReplaceCell: assign({ replaceCell: null }),
        select: send('SELECT', { to: 'select' }),
        setSelected: assign({
          selected: (_, evt) => evt.selected,
          replaceCell: (ctx, evt) => (evt.selected === ctx.replaceCell ? null : ctx.replaceCell),
        }),
        setReplaceCell: assign({
          replaceCell: (ctx) => {
            const { hovering, replaceCell, selected } = ctx;
            const i = hovering.indexOf(replaceCell);
            const next = i + 1 < hovering.length ? hovering[i + 1] : hovering[0];
            const nextNext = i + 2 < hovering.length ? hovering[i + 2] : replaceCell;
            return next === selected ? nextNext : next;
          },
        }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        replace: send((ctx, evt) => ({ type: 'REPLACE', a: ctx.selected, b: ctx.replaceCell }), {
          to: 'cells',
        }),
      },
    }
  );
}

export default createReplaceMachine;
