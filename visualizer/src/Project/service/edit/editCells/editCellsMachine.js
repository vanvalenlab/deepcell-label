import { actions, assign, forwardTo, Machine, send, spawn } from 'xstate';
import createSelectMachine from '../segment/selectMachine';
import createDeleteMachine from './deleteMachine';
import createNewCellMachine from './newCellMachine';
import createReplaceMachine from './replaceMachine';
import createSwapMachine from './swapMachine';

const { pure, respond } = actions;

function createEditCellsMachine({ eventBuses, undoRef }) {
  return Machine(
    {
      id: 'editCells',
      entry: [send('REGISTER_UI', { to: undoRef })],
      context: {
        tool: 'select',
        tools: null,
        eventBuses,
      },
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
    {
      actions: {
        setTool: pure((ctx, evt) => [
          send('EXIT', { to: ctx.tools[ctx.tool] }),
          assign({ tool: evt.tool }),
        ]),
        save: respond((ctx) => ({ type: 'RESTORE', tool: ctx.tools[ctx.tool] })),
        restore: assign({ tool: (_, evt) => evt.tool }),
        spawnTools: assign({
          tools: (ctx) => ({
            select: spawn(createSelectMachine(ctx)),
            swap: spawn(createSwapMachine(ctx)),
            replace: spawn(createReplaceMachine(ctx)),
            delete: spawn(createDeleteMachine(ctx)),
            new: spawn(createNewCellMachine(ctx)),
          }),
        }),
        forwardToTool: forwardTo((ctx) => ctx.tools[ctx.tool]),
      },
    }
  );
}

export default createEditCellsMachine;
