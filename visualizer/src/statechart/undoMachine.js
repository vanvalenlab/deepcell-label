import { Machine, assign, forwardTo, send, spawn, actions, sendParent } from 'xstate';

const { pure } = actions;

const createHistoryMachine = (actor) => Machine(
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
        entry: ['restorePast', () => console.log('restoring past')],
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
      saveContext: send('SAVE', { to: (context) => context.actor }),
      saveRestore: assign((context, event) => ({
        past: [...context.past, event],
        future: [],
      })),
      restorePast: send(
        (context) => context.past[context.past.length - 1],
        { to: (context) => context.actor }
      ),
      restoreFuture: send(
        (context) => context.future[context.future.length - 1],
        { to: (context) => context.actor }
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

const undoMachine = Machine(
  {
    id: 'undo',
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
          RESTORED: { actions: 'incrementCount' }, // target: 'restored', 
        },
        always: { cond: 'allHistoriesResponded', target: 'idle', actions: send('BACKENDUNDO') }
      },
      redoing: {
        entry: 'resetCounts',
        on: {
          SAMECONTEXT: { actions: 'incrementCount' },
          RESTORED: { actions: 'incrementCount' }, // target: 'restored', 
        },
        always: { cond: 'allHistoriesResponded', target: 'idle', actions: send('BACKENDREDO') }
      },
      // restored: {
      //   on: {
      //     SAMECONTEXT: { actions: 'incrementCount' },
      //     RESTORED: { actions: 'incrementCount' },
      //   },
      //   always: { cond: 'allHistoriesResponded', target: 'idle' }
      // }
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
        histories: ({ histories }, { actor }) => [...histories, spawn(createHistoryMachine(actor))],
      }),
      setUpHistories: assign({
        histories: (context) => context.actors.map(
          (actor) => spawn(createHistoryMachine(actor))
        ),
      }),
      forwardToHistories: pure((context) => {
        return context.histories.map(
          (actor) => forwardTo(actor)
        );
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

export default undoMachine;
