/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createEditCellsMachine from './editCells';
import createEditDivisionsMachine from './editDivisionsMachine';
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
        editDivisionsRef: null,
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
      initial: 'setUp',
      states: {
        setUp: {
          entry: [send('REGISTER_UI', { to: undoRef }), 'spawnTools'],
          always: 'loading',
        },
        loading: {
          on: {
            LOADED: 'checkTool',
          },
        },
        checkTool: {
          always: [
            { cond: ({ tool }) => tool === 'editDivisions', target: 'editDivisions' },
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
        editDivisions: {
          entry: [
            assign({ tool: 'editDivisions' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
          on: {
            mouseup: { actions: forwardTo('editDivisions') },
            mousedown: { actions: forwardTo('editDivisions') },
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
        editSpots: {
          entry: [
            assign({ tool: 'editCells' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
        },
      },
      on: {
        SAVE: { actions: 'save' },
        RESTORE: { target: '.checkTool', actions: ['restore', respond('RESTORED')] },

        EDIT_SEGMENT: 'editSegment',
        EDIT_DIVISIONS: 'editDivisions',
        EDIT_CELLS: 'editCells',
        EDIT_SPOTS: 'editSpots',

        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
      },
    },
    {
      actions: {
        save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
        restore: assign((_, { tool }) => ({ tool })),
        spawnTools: assign((context) => ({
          editSegmentRef: spawn(createEditSegmentMachine(context), 'editSegment'),
          editDivisionsRef: spawn(createEditDivisionsMachine(context), 'editDivisions'),
          editCellsRef: spawn(createEditCellsMachine(context), 'editCells'),
        })),
      },
    }
  );

export default createEditMachine;
