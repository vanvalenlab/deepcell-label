import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from './eventBus';

const { pure } = actions;

const createHistoryMachine = (actor) =>
  Machine(
    {
      id: 'history',
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
            BACKEND_UNDO: { actions: 'movePastToFuture' },
            BACKEND_REDO: { actions: 'moveFutureToPast' },
          },
        },
        saving: {
          entry: 'saveContext',
          on: {
            RESTORE: { target: 'idle', actions: 'saveRestore' },
          },
          exit: sendParent('SAVED'),
        },
        restoringPast: {
          entry: 'restorePast',
          on: {
            RESTORED: { target: 'idle', actions: 'forwardToParent' },
          },
        },
        restoringFuture: {
          entry: 'restoreFuture',
          on: {
            RESTORED: { target: 'idle', actions: 'forwardToParent' },
          },
        },
      },
    },
    {
      actions: {
        forwardToParent: sendParent((context, event) => event),
        saveContext: send('SAVE', { to: (context) => context.actor }),
        saveRestore: assign((context, event) => ({
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

const createUndoMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'undo',
      invoke: [
        { id: 'eventBus', src: fromEventBus('undo', () => eventBuses.undo) },
        { id: 'api', src: fromEventBus('undo', () => eventBuses.api) },
      ],
      context: {
        histories: [],
        count: 0,
        numHistories: 0,
        action: 0,
        numActions: 0,
      },
      on: {
        ADD_ACTOR: { actions: 'addActor' },
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
              actions: 'forwardToHistories',
            },
            REDO: {
              target: 'redoing',
              cond: 'canRedo',
              actions: 'forwardToHistories',
            },
            BACKEND_UNDO: {
              actions: ['decrementAction', forwardTo('api'), 'forwardToHistories'],
            },
            BACKEND_REDO: {
              actions: ['incrementAction', forwardTo('api'), 'forwardToHistories'],
            },
          },
        },
        saving: {
          entry: 'resetCounts',
          on: { SAVED: { actions: 'incrementCount' } },
          always: { cond: 'allHistoriesResponded', target: 'idle' },
        },
        undoing: {
          entry: 'resetCounts',
          on: {
            RESTORED: { actions: 'incrementCount' },
          },
          always: {
            cond: 'allHistoriesResponded',
            target: 'idle',
            actions: send('BACKEND_UNDO'),
          },
        },
        redoing: {
          entry: 'resetCounts',
          on: {
            RESTORED: { actions: 'incrementCount' },
          },
          always: {
            cond: 'allHistoriesResponded',
            target: 'idle',
            actions: send('BACKEND_REDO'),
          },
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
        forwardToHistories: pure((context) => {
          return context.histories.map((actor) => forwardTo(actor));
        }),
        resetCounts: assign({
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
