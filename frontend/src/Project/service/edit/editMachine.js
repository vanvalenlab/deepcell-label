/**
 * Manages which tab of controls is open.
 * Spawns editSegment, editCells, and editDivisions machine to control each tab.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createEditCellsMachine from './editCells';
import createEditCellTypesMachine from './editCellTypesMachine';
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
        editCellTypesRef: null,
      },
      invoke: [
        {
          id: 'canvas',
          src: fromEventBus('tool', () => eventBuses.canvas, ['mouseup', 'mousedown']),
        },
        { id: 'select', src: fromEventBus('tool', () => eventBuses.select, 'SELECTED') },
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
            { cond: ({ tool }) => tool === 'editSegment', target: 'editSegment' },
            { cond: ({ tool }) => tool === 'editCells', target: 'editCells' },
            { cond: ({ tool }) => tool === 'editDivisions', target: 'editDivisions' },
            { cond: ({ tool }) => tool === 'editCellTypes', target: 'editCellTypes' },
            { cond: ({ tool }) => tool === 'editSpots', target: 'editSpots' },
            { target: 'editSegment' },
          ],
        },
        editSegment: {
          entry: [assign({ tool: 'editSegment' }), send({ type: 'ENTER_TAB' })],
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
        editCellTypes: {
          entry: [
            assign({ tool: 'editCellTypes' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
          on: {
            mouseup: { actions: forwardTo('editCellTypes') },
            mousedown: { actions: forwardTo('editCellTypes') },
          },
        },
        editSpots: {
          entry: [
            assign({ tool: 'editCells' }),
            send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
          ],
          on: {
            mouseup: { actions: send('SELECT', { to: 'select' }) },
          },
        },
      },
      on: {
        SAVE: { actions: 'save' },
        RESTORE: { target: '.checkTool', actions: ['restore', respond('RESTORED')] },
        EDIT_SEGMENT: 'editSegment',
        EDIT_DIVISIONS: 'editDivisions',
        EDIT_CELLS: 'editCells',
        EDIT_CELLTYPES: 'editCellTypes',
        EDIT_SPOTS: 'editSpots',

        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
        ENTER_TAB: { actions: forwardTo('editSegment') },
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
          editCellTypesRef: spawn(createEditCellTypesMachine(context), 'editCellTypes'),
        })),
      },
    }
  );

export default createEditMachine;
