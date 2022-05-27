/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createEditCellsMachine from './editCells';
import createEditLineageMachine from './editLineageMachine';
import createEditSegmentMachine from './segment';

const createEditMachine = ({ eventBuses, undoRef }) =>
  Machine(
    {
      id: 'tool',
      context: {
        tool: 'editSegment',
        eventBuses,
        undoRef,
        editSegmentRef: null,
        editLineageRef: null,
        editCellsRef: null,
      },
      invoke: [
        {
          id: 'canvas',
          src: fromEventBus('tool', () => eventBuses.canvas, ['mouseup', 'mousedown']),
        },
        { src: fromEventBus('tool', () => eventBuses.select, 'SELECTED') },
        { src: fromEventBus('tool', () => eventBuses.load, 'LOADED') },
      ],
      initial: 'loading',
      entry: [send('REGISTER_UI', { to: undoRef }), 'spawnTools'],
      states: {
        loading: {
          on: {
            LOADED: [{ cond: 'hasLineage', target: 'editLineage' }, { target: 'editCells' }],
          },
        },
        checkTool: {
          always: [
            { cond: ({ tool }) => tool === 'editLineage', target: 'editLineage' },
            { cond: ({ tool }) => tool === 'editCells', target: 'editCells' },
            { target: 'editSegment' },
          ],
        },
        editSegment: {
          entry: assign({ tool: 'editSegment' }),
          on: {
            mouseup: { actions: forwardTo('editSegment') },
            mousedown: { actions: forwardTo('editSegment') },
          },
        },
        editLineage: {
          entry: [
            assign({ tool: 'editLineage' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
          on: {
            mouseup: { actions: forwardTo('editLineage') },
            mousedown: { actions: forwardTo('editLineage') },
          },
        },
        editCells: {
          entry: [
            assign({ tool: 'editCells' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
          on: {
            mouseup: { actions: forwardTo('editCells') },
            mousedown: { actions: forwardTo('editCells') },
          },
        },
      },
      on: {
        SAVE: { actions: 'save' },
        RESTORE: { target: '.checkTool', actions: ['restore', respond('RESTORED')] },

        EDIT_SEGMENT: 'editSegment',
        EDIT_LINEAGE: 'editLineage',
        EDIT_CELLS: 'editCells',

        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
      },
    },
    {
      guards: {
        hasLineage: (ctx, evt) => evt.lineage !== null && evt.lineage !== undefined,
      },
      actions: {
        save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
        restore: assign((_, { tool }) => ({ tool })),
        spawnTools: assign((context) => ({
          editSegmentRef: spawn(createEditSegmentMachine(context), 'editSegment'),
          editLineageRef: spawn(createEditLineageMachine(context), 'editLineage'),
          editCellsRef: spawn(createEditCellsMachine(context), 'editCells'),
        })),
      },
    }
  );

export default createEditMachine;
