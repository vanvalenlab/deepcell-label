import { actions, assign, forwardTo, Machine, spawn } from 'xstate';
import { fromEventBus } from './eventBus';
import createHistoryMachine from './undo/historyMachine';
import createLabelHistoryMachine from './undo/labelHistoryMachine';

const { pure } = actions;

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
