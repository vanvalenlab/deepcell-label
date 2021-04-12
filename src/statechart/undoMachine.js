import { Machine, assign, forwardTo, send, spawn, actions, sendParent } from 'xstate';

const { pure } = actions;

const createHistoryMachine = (ref) => Machine(
  {
    id: 'history',
    context: {
      ref,
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
          BACKENDUNDO: { actions: 'movePastToFuture' },
          BACKENDREDO: { actions: 'moveFutureToPast' },
        }
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
          SAMECONTEXT: { target: 'idle', actions: ['forwardToParent'] },
          RESTORED: { target: 'idle', actions: 'forwardToParent' },
        },
      },
      restoringFuture: {
        entry: 'restoreFuture',
        on: {
          SAMECONTEXT: { target: 'idle', actions: 'forwardToParent' },
          RESTORED: { target: 'idle', actions: 'forwardToParent' },
        },
      },
    },
  },
  {
    actions: {
      forwardToParent: sendParent((context, event) => event),
      saveContext: send('SAVE', { to: (context) => context.ref }),
      saveRestore: assign((context, event) => ({
        past: [...context.past, event],
        future: [],
      })),
      restorePast: send(
        (context) => context.past[context.past.length - 1],
        { to: (context) => context.ref }
      ),
      restoreFuture: send(
        (context) => context.future[context.future.length - 1],
        { to: (context) => context.ref }
      ),
      movePastToFuture: assign({
        past: (context) => context.past.slice(0, context.past.length - 1),
        future: (context) => [...context.future, context.past[context.past.length - 1]],
      }),
      moveFutureToPast: assign({
        past: (context) => [...context.past, context.future[context.future.length - 1]],
        future: (context) => context.future.slice(0, context.future.length - 1),
      }),
    }
  }
);

const createUndoMachine = ({ canvasRef }) => Machine(
  {
    id: 'undo',
    context: {
      actors: [canvasRef],
      historyActors: null,
      count: 0,
      numActors: 0,
      action: 0,
      numActions: 0,
    },
    initial: 'setUpHistories',
    states: {
      setUpHistories: {
        entry: 'setUpHistories',
        always: 'idle',
      },
      idle: {
        on: {
          EDIT: { target: 'saving', actions: ['newAction', 'forwardToHistories'] },
          UNDO: { target: 'undoing', cond: 'canUndo', actions: 'forwardToHistories' },
          REDO: { target: 'redoing', cond: 'canRedo', actions: 'forwardToHistories' },
          BACKENDUNDO: { actions: ['decrementAction', sendParent('BACKENDUNDO'), 'forwardToHistories'] },
          BACKENDREDO: { actions: ['incrementAction', sendParent('BACKENDREDO'), 'forwardToHistories'] },
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
          SAMECONTEXT: { actions: 'incrementCount' },
          RESTORED: { target: 'restored', actions: 'incrementCount' },
        },
        always: { cond: 'allHistoriesResponded', target: 'idle', actions: send('BACKENDUNDO') }
      },
      redoing: {
        entry: 'resetCounts',
        on: {
          SAMECONTEXT: { actions: 'incrementCount' },
          RESTORED: { target: 'restored', actions: 'incrementCount' },
        },
        always: { cond: 'allHistoriesResponded', target: 'idle', actions: send('BACKENDREDO') }
      },
      restored: {
        on: {
          SAMECONTEXT: { actions: 'incrementCount' },
          RESTORED: { actions: 'incrementCount' },
        },
        always: { cond: 'allHistoriesResponded', target: 'idle' }
      }
    },
  },
  {
    guards: {
      allHistoriesResponded: (context) => context.count === context.numActors,
      canUndo: (context) => context.action > 0,
      canRedo: (context) => context.action < context.numActions,
    },
    actions: {
      setUpHistories: assign({
        historyActors: (context) => context.actors.map((actor) => spawn(createHistoryMachine(actor))),
      }),
      forwardToHistories: pure((context) => {
        return context.historyActors.map((actor) => forwardTo(actor));
      }),
      resetCounts: assign({
        count: 0,
        numActors: (context) => context.historyActors.length,
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
