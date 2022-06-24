/**
 * Records UI state before each action.
 * Sends SAVE events to an actor.
 * Records the actor's RESTORE response to send back on UNDO and REDO.
 */
import { assign, Machine, send, sendParent } from 'xstate';

function createHistoryMachine(actor) {
  return Machine(
    {
      context: {
        actor,
        past: [],
        future: [],
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SAVE: 'saving',
            REVERT_SAVE: { actions: 'revertSave' },
            UNDO: 'restoringPast',
            REDO: 'restoringFuture',
          },
        },
        saving: {
          entry: 'getSnapshot',
          on: {
            RESTORE: { target: 'idle', actions: 'saveSnapshot' },
          },
          exit: sendParent('SAVED'),
        },
        restoringPast: {
          entry: 'restorePast',
          exit: 'movePastToFuture',
          on: {
            RESTORED: { target: 'idle', actions: 'forwardToParent' },
          },
          // fallback in case actor does not respond
          after: {
            500: {
              target: 'idle',
              actions: [
                sendParent('RESTORED'),
                // TODO: log what actors are not restoring
                () => console.log('could not restore actor'),
              ],
            },
          },
        },
        restoringFuture: {
          entry: 'restoreFuture',
          exit: 'moveFutureToPast',
          on: {
            RESTORED: { target: 'idle', actions: 'forwardToParent' },
          },
          // fallback in case actor does not respond
          after: {
            500: {
              target: 'idle',
              actions: [
                sendParent('RESTORED'),
                // TODO: log what actors are not restoring
                () => console.log('could not restore actor'),
              ],
            },
          },
        },
      },
    },
    {
      actions: {
        forwardToParent: sendParent((ctx, evt) => evt),
        getSnapshot: send('SAVE', { to: (ctx) => ctx.actor }),
        revertSave: assign({ past: (ctx) => ctx.past.slice(0, ctx.past.length - 1) }),
        saveSnapshot: assign((ctx, evt) => ({
          past: [...ctx.past, evt],
          future: [],
        })),
        restorePast: send((ctx) => ctx.past[ctx.past.length - 1], {
          to: (ctx) => ctx.actor,
        }),
        restoreFuture: send((ctx) => ctx.future[ctx.future.length - 1], {
          to: (ctx) => ctx.actor,
        }),
        movePastToFuture: assign({
          past: (ctx) => ctx.past.slice(0, ctx.past.length - 1),
          future: (ctx) => [...ctx.future, ctx.past[ctx.past.length - 1]],
        }),
        moveFutureToPast: assign({
          past: (ctx) => [...ctx.past, ctx.future[ctx.future.length - 1]],
          future: (ctx) => ctx.future.slice(0, ctx.future.length - 1),
        }),
      },
    }
  );
}

export default createHistoryMachine;
