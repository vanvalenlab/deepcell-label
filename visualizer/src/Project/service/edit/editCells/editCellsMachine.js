import { actions, assign, forwardTo, Machine, send, spawn } from 'xstate';
import { fromEventBus } from '../../eventBus';
import createSelectMachine from '../segment/selectMachine';
import createDeleteMachine from './deleteMachine';
import createNewCellMachine from './newCellMachine';
import createReplaceMachine from './replaceMachine';
import createSwapMachine from './swapMachine';

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
        setTool: pure((ctx, evt) => [send('EXIT', { to: ctx.tool }), assign({ tool: evt.tool })]),
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
