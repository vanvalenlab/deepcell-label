import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

function createReplaceMachine(context) {
  return Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('replace', () => context.eventBuses.select) },
        { id: 'cells', src: fromEventBus('replace', () => context.eventBuses.cells) },
        { src: fromEventBus('replace', () => context.eventBuses.hovering) },
      ],
      context: {
        selected: context.selected,
        replaceCell: null,
        hovering: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          { cond: 'shift', actions: 'setReplaceCell' },
          { cond: 'onReplaceCell', actions: 'replace' },
          { actions: 'setReplaceCell' },
        ],
        EXIT: { actions: 'resetReplaceCell' },
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onReplaceCell: (ctx) => ctx.hovering.includes(ctx.replaceCell),
      },
      actions: {
        resetReplaceCell: assign({ replaceCell: null }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setReplaceCell: assign({
          replaceCell: (ctx) => {
            const { hovering, replaceCell } = ctx;
            const i = hovering.indexOf(replaceCell);
            return i === -1 || i === hovering.length - 1 ? hovering[0] : hovering[i + 1];
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