/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { canvasEventBus } from '../canvasMachine';
import { fromEventBus } from '../eventBus';
import { selectedCellsEventBus } from '../selectMachine';
import { undoEventBus } from '../undoMachine';
import segmentMachine from './segmentMachine';
import trackMachine from './trackMachine';

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
      tool: 'segment',
    },
    invoke: [
      { id: 'selectedCells', src: fromEventBus('tool', () => selectedCellsEventBus) },
      { id: 'canvas', src: fromEventBus('tool', () => canvasEventBus) },
      { id: 'undo', src: fromEventBus('tool', () => undoEventBus) },
    ],
    initial: 'checkTool',
    entry: ['spawnTools', 'addToolsToUndo', 'checkTrack'],
    states: {
      checkTool: {
        always: [{ cond: ({ tool }) => tool === 'track', target: 'track' }, { target: 'segment' }],
      },
      segment: {
        on: {
          mouseup: { actions: forwardTo('segment') },
          mousedown: { actions: forwardTo('segment') },
          mousemove: { actions: forwardTo('segment') },
        },
      },
      track: {
        entry: send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }, { to: 'canvas' }),
        on: {
          mouseup: { actions: forwardTo('track') },
          mousedown: { actions: forwardTo('track') },
          mousemove: { actions: forwardTo('track') },
        },
      },
    },
    on: {
      SAVE: { actions: 'save' },
      RESTORE: { target: '.checkTool', actions: ['restore', respond('RESTORED')] },

      SEGMENT: { target: '.checkTool', actions: assign({ tool: 'segment' }) },
      TRACK: { target: '.checkTool', actions: assign({ tool: 'track' }) },
    },
  },
  {
    actions: {
      save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
      restore: assign((_, { tool }) => ({ tool })),
      spawnTools: assign({
        segmentRef: () => spawn(segmentMachine, 'segment'),
        trackRef: () => spawn(trackMachine, 'track'),
      }),
      checkTrack: send(() => {
        const search = new URLSearchParams(window.location.search);
        const track = search.get('track');
        return track ? { type: 'TRACK' } : { type: 'SEGMENT' };
      }),
      addToolsToUndo: send(({ segmentRef }) => ({ type: 'ADD_ACTOR', actor: segmentRef }), {
        to: 'undo',
      }),
    },
  }
);

export default toolMachine;
