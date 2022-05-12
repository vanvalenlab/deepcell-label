import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from './eventBus';

const { pure } = actions;

/** Records a stack of snapshots of an actor's state before each action.
 * Sends SAVE events to an actor and stores the actor's responses to send back when undoing or redoing actions.
 */
const createHistoryMachine = (actor) =>
  Machine(
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
      },
      entry: send({ type: 'HISTORY_REF' }, { to: actor }),
      initial: 'idle',
      states: {
        idle: {
          on: {
            SAVE_LABELS: { actions: 'addSnapshotToPast' },
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
        addSnapshotToPast: assign({
          past: (ctx, evt) => [...ctx.past, [evt.initialLabels, evt.editedLabels]],
          future: [],
        }),
        undo: send((ctx, evt) => ({ type: 'EDITED', ...ctx.past[ctx.past.length - 1][0] }), {
          to: (ctx) => ctx.actor,
        }),
        redo: send((ctx, evt) => ({ type: 'EDITED', ...ctx.future[ctx.future.length - 1][1] }), {
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

const createUndoMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'undo',
      invoke: [
        { id: 'eventBus', src: fromEventBus('undo', () => eventBuses.undo) }, // lets undoMachine get ADD_ACTOR and ADD_LABEL_ACTOR events
        { id: 'api', src: fromEventBus('undo', () => eventBuses.api) }, // listens for EDIT events to know when to take UI snapshots
      ],
      context: {
        histories: [], // UI history
        labelHistories: [], // labeled data history
        count: 0,
        numHistories: 0,
        action: 0,
        numActions: 0,
      },
      on: {
        ADD_ACTOR: { actions: 'addActor' },
        ADD_LABEL_ACTOR: { actions: 'addLabelActor' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            EDIT: {
              target: 'saving',
              actions: ['newAction', 'forwardToHistories'],
            },
            UNDO: {
              target: 'undoing',
              cond: 'canUndo',
              actions: ['decrementAction', 'forwardToHistories'],
            },
            REDO: {
              target: 'redoing',
              cond: 'canRedo',
              actions: ['incrementAction', 'forwardToHistories'],
            },
          },
        },
        saving: {
          entry: 'resetCount',
          on: { SAVED: { actions: 'incrementCount' } },
          always: { cond: 'allHistoriesResponded', target: 'idle' },
        },
        undoing: {
          entry: 'resetCount',
          on: { RESTORED: { actions: 'incrementCount' } },
          always: { cond: 'allHistoriesResponded', target: 'idle' },
        },
        redoing: {
          entry: 'resetCount',
          on: { RESTORED: { actions: 'incrementCount' } },
          always: { cond: 'allHistoriesResponded', target: 'idle' },
        },
      },
    },
    {
      guards: {
        allHistoriesResponded: (context) => context.count === context.numHistories,
        canUndo: (context) => context.action > 0,
        canRedo: (context) => context.action < context.numActions,
      },
      actions: {
        addActor: assign({
          histories: ({ histories }, { actor }) => [
            ...histories,
            spawn(createHistoryMachine(actor)),
          ],
        }),
        addLabelActor: assign({
          labelHistories: ({ labelHistories }, { actor }) => [
            ...labelHistories,
            spawn(createLabelHistoryMachine(actor)),
          ],
        }),
        forwardToHistories: pure((ctx, evt) => {
          return [...ctx.histories.map(forwardTo), ...ctx.labelHistories.map(forwardTo)];
        }),
        resetCount: assign({
          count: 0,
          numHistories: (context) => context.histories.length,
        }),
        incrementCount: assign({
          count: (context) => context.count + 1,
        }),
        newAction: assign({
          action: (context) => context.action + 1,
          numActions: (context) => context.action + 1,
        }),
        incrementAction: assign({
          action: (context) => context.action + 1,
        }),
        decrementAction: assign({
          action: (context) => context.action - 1,
        }),
      },
    }
  );

export default createUndoMachine;
