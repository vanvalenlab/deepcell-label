import { actions, assign, forwardTo, Machine, send, spawn } from 'xstate';
import { fromEventBus } from '../eventBus';
import createDeleteMachine from './editCells/deleteMachine';
import createNewCellMachine from './editCells/newCellMachine';
import createReplaceMachine from './editCells/replaceMachine';
import createSwapMachine from './editCells/swapMachine';
import createSelectMachine from './segment/selectMachine';

const { pure, respond } = actions;

function createEditCellsMachine({ eventBuses }) {
  return Machine(
    {
      id: 'editCells',
      invoke: [
        { id: 'api', src: fromEventBus('editCells', () => eventBuses.api) },
        { id: 'select', src: fromEventBus('editCells', () => eventBuses.select) },
      ],
      context: {
        selected: null,
        tool: 'select',
        tools: null,
        eventBuses,
      },
      initial: 'getSelected',
      states: {
        getSelected: {
          entry: send('GET_SELECTED', { to: 'select' }),
          on: {
            SELECTED: { actions: 'setSelected', target: 'idle' },
          },
        },
        idle: {
          entry: 'spawnTools',
          on: {
            SET_TOOL: { actions: 'setTool' },
            // from canvas event bus (forwarded from parent)
            mousedown: { actions: 'forwardToTool' },
            mouseup: { actions: 'forwardToTool' },
            HOVERING: { actions: 'forwardToTools' },
            COORDINATES: { actions: 'forwardToTools' },
            // for undo/redo
            SAVE: { actions: 'save' },
            RESTORE: { actions: ['restore', respond('RESTORED')] },
          },
        },
      },
    },
    {
      actions: {
        setSelected: assign({ selected: (_, { selected }) => selected }),
        setTool: assign({ tool: (ctx, evt) => evt.tool }),
        save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
        restore: assign((_, { tool }) => ({ tool })),
        spawnTools: assign({
          tools: (context) => ({
            select: spawn(createSelectMachine(context), 'select'),
            swap: spawn(createSwapMachine(context), 'swap'),
            replace: spawn(createReplaceMachine(context), 'replace'),
            delete: spawn(createDeleteMachine(context), 'delete'),
            new: spawn(createNewCellMachine(context), 'new'),
          }),
        }),
        forwardToTool: forwardTo(({ tool }) => tool),
        forwardToTools: pure(({ tools }) => Object.values(tools).map((tool) => forwardTo(tool))),
      },
    }
  );
}

export default createEditCellsMachine;
