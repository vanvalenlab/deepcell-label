import { assign, Machine, send } from 'xstate';

/** Records edited labels before and after each action. */
function createLabelHistoryMachine(actor) {
  return Machine(
    {
      id: 'label-history', // TODO: add actor to ID
      context: {
        actor,
        // TODO: switch from snapshot list to object with action IDs as keys
        // not every action edits all labels, so use ID to check if there's a snapshot for the undone/redone action
        past: [],
        future: [],
        currentLabels: null,
      },
      entry: [
        (c, e) => console.log('creating label history', c, e),
        send('LABEL_HISTORY', { to: actor }),
      ],
      initial: 'idle',
      states: {
        idle: {
          on: {
            SNAPSHOT: { actions: 'saveSnapshot' },
            UNDO: 'undoing',
            REDO: 'redoing',
          },
        },
        undoing: {
          entry: 'undo',
          always: 'idle',
          exit: 'movePastToFuture',
        },
        redoing: {
          entry: 'redo',
          always: 'idle',
          exit: 'moveFutureToPast',
        },
      },
    },
    {
      actions: {
        saveSnapshot: assign({
          past: (ctx, evt) => [...ctx.past, evt],
          future: [],
        }),
        undo: send((ctx, evt) => ctx.past[ctx.past.length - 1].before, {
          to: (ctx) => ctx.actor,
        }),
        redo: send((ctx, evt) => ctx.future[ctx.future.length - 1].after, {
          to: (ctx) => ctx.actor,
        }),
        movePastToFuture: assign({
          past: (context) => context.past.slice(0, context.past.length - 1),
          future: (context) => [...context.future, context.past[context.past.length - 1]],
        }),
        moveFutureToPast: assign({
          past: (context) => [...context.past, context.future[context.future.length - 1]],
          future: (context) => context.future.slice(0, context.future.length - 1),
        }),
      },
    }
  );
}

export default createLabelHistoryMachine;
