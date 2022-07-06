/** Manages recording the UI and labeled data as actions are done, undone, and redone.
 *
 * Spawns historyMachines to track the state of UI and labelHistoryMachines to track the labeled data.
 *
 * UI state machines send REGISTER_UI events to track their state.
 * Label state machines send REGISTER_LABELS events to track their state.
 *
 * UI histories record state every action, while label histories record state only when
 */
import { actions, assign, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createHistoryMachine from './historyMachine';
import createLabelHistoryMachine from './labelHistoryMachine';

const { pure } = actions;

const createUndoMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'undo',
      invoke: [
        { id: 'eventBus', src: fromEventBus('undo', () => eventBuses.undo) }, // lets undoMachine get SAVE events
      ],
      context: {
        uiHistories: [], // records UI state for every edit
        labelHistories: [], // records state after receiving EDITED event with edit ID
        count: 0,
        numUiHistories: 0,
        edit: 0,
        numEdits: 0,
      },
      on: {
        REGISTER_UI: { actions: 'registerUi' },
        REGISTER_LABELS: { actions: 'registerLabels' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SAVE: {
              target: 'saving',
              actions: 'save',
            },
            REVERT_SAVE: { actions: 'revertSave' },
            UNDO: {
              target: 'undoing',
              cond: 'canUndo',
              actions: 'undo',
            },
            REDO: {
              target: 'redoing',
              cond: 'canRedo',
              actions: 'redo',
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
        allHistoriesResponded: (ctx) => ctx.count === ctx.numHistories,
        canUndo: (ctx) => ctx.edit > 0,
        canRedo: (ctx) => ctx.edit < ctx.numEdits,
      },
      actions: {
        registerUi: assign({
          uiHistories: (ctx, evt, meta) => [
            ...ctx.uiHistories,
            spawn(createHistoryMachine(meta._event.origin)),
          ],
        }),
        registerLabels: assign({
          labelHistories: (ctx, evt, meta) => [
            ...ctx.labelHistories,
            spawn(createLabelHistoryMachine(meta._event.origin)),
          ],
        }),
        save: pure((ctx) => {
          const save = { type: 'SAVE', edit: ctx.edit };
          return [
            respond(save),
            ...ctx.uiHistories.map((h) => send(save, { to: h })),
            assign({ edit: ctx.edit + 1, numEdits: ctx.edit + 1 }),
          ];
        }),
        revertSave: pure((ctx, evt) => {
          return [
            ...ctx.uiHistories.map((h) => send(evt, { to: h })),
            assign({ edit: ctx.edit - 1, numEdits: ctx.edit - 1 }),
          ];
        }),
        undo: pure((ctx) => {
          const undo = { type: 'UNDO', edit: ctx.edit - 1 };
          return [
            assign({ edit: ctx.edit - 1 }),
            ...ctx.uiHistories.map((h) => send(undo, { to: h })),
            ...ctx.labelHistories.map((h) => send(undo, { to: h })),
          ];
        }),
        redo: pure((ctx) => {
          const redo = { type: 'REDO', edit: ctx.edit };
          return [
            assign({ edit: ctx.edit + 1 }),
            ...ctx.uiHistories.map((h) => send(redo, { to: h })),
            ...ctx.labelHistories.map((h) => send(redo, { to: h })),
          ];
        }),
        resetCount: assign({
          count: 0,
          numHistories: (ctx) => ctx.uiHistories.length,
        }),
        incrementCount: assign({
          count: (ctx) => ctx.count + 1,
        }),
      },
    }
  );

export default createUndoMachine;
