/**
 * Manages history of labeled data.
 * Records data before and after action when receiving SNAPSHOT event.
 * Resends SNAPSHOTs on UNDO and REDO events.
 */

import { assign, Machine, send } from 'xstate';

/** Records edited labels before and after each action. */
function createLabelHistoryMachine(actor) {
  return Machine(
    {
      id: 'label-history', // TODO: add actor to ID
      context: {
        actor,
        past: {},
        future: {},
      },
      entry: send('LABEL_HISTORY', { to: actor }),
      initial: 'idle',
      states: {
        idle: {
          on: {
            SNAPSHOT: { actions: 'saveSnapshot' },
            UNDO: { cond: 'canUndo', target: 'undoing' },
            REDO: { cond: 'canRedo', target: 'redoing' },
          },
        },
        undoing: {
          entry: ['undo', 'setEdit'],
          always: 'idle',
          exit: 'movePastToFuture',
        },
        redoing: {
          entry: ['redo', 'setEdit'],
          always: 'idle',
          exit: 'moveFutureToPast',
        },
      },
    },
    {
      guards: {
        canUndo: (ctx, evt) => evt.edit in ctx.past,
        canRedo: (ctx, evt) => evt.edit in ctx.future,
      },
      actions: {
        setEdit: assign({ edit: (ctx, evt) => evt.edit }),
        saveSnapshot: assign({
          past: (ctx, evt) => ({ ...ctx.past, [evt.edit]: evt }),
          future: {},
        }),
        undo: send((ctx, evt) => ctx.past[evt.edit].before, {
          to: (ctx) => ctx.actor,
        }),
        redo: send((ctx, evt) => ctx.future[evt.edit].after, {
          to: (ctx) => ctx.actor,
        }),
        movePastToFuture: assign((ctx, evt) => {
          const { [ctx.edit]: snapshot, ...past } = ctx.past;
          const future = { ...ctx.future, [ctx.edit]: snapshot };
          return { past, future };
        }),
        moveFutureToPast: assign((ctx, evt) => {
          const { [ctx.edit]: snapshot, ...future } = ctx.future;
          const past = { ...ctx.past, [ctx.edit]: snapshot };
          return { past, future };
        }),
      },
    }
  );
}

export default createLabelHistoryMachine;
