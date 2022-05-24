import { actions, assign, Machine, send, sendParent } from 'xstate';

const { pure } = actions;

/** Records a stack of snapshots of an actor's state before each action.
 * Sends SAVE events to an actor and stores the actor's responses to send back when undoing or redoing actions.
 */
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
            EDIT: 'saving',
            UNDO: 'restoringPast',
            REDO: 'restoringFuture',
          },
        },
        saving: {
          entry: 'getSnapshot',
          on: {
            RESTORE: { target: 'idle', actions: 'saveSnapshotInPast' },
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
        forwardToParent: sendParent((context, event) => event),
        getSnapshot: send('SAVE', { to: (context) => context.actor }),
        saveSnapshotInPast: assign((context, event) => ({
          past: [...context.past, event],
          future: [],
        })),
        restorePast: send((context) => context.past[context.past.length - 1], {
          to: (context) => context.actor,
        }),
        restoreFuture: send((context) => context.future[context.future.length - 1], {
          to: (context) => context.actor,
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

export default createHistoryMachine;
