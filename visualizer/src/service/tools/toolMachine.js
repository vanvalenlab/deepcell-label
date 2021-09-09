/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { pure, respond } from 'xstate/lib/actions';
import segmentMachine from './segmentMachine';
import trackMachine from './trackMachine';

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
      tool: 'track',
    },
    initial: 'checkTool',
    entry: ['spawnTools', 'addToolsToUndo', () => console.log('test')],
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
        entry: send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
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

      GRAYSCALE: { actions: forwardTo('segment') },
      COLOR: { actions: forwardTo('segment') },
      COORDINATES: { actions: forwardTo('segment') },
      LABELS: { actions: [forwardTo('segment'), forwardTo('track')] },
      LABEL: { actions: [forwardTo('segment'), forwardTo('track')] },
      FOREGROUND: { actions: [forwardTo('segment'), forwardTo('track')] },
      BACKGROUND: { actions: [forwardTo('segment'), forwardTo('track')] },
      SELECTED: { actions: [forwardTo('segment'), forwardTo('track')] },

      EDIT: { actions: 'sendParent' },
      SET_PAN_ON_DRAG: { actions: 'sendParent' },
      SET_FOREGROUND: { actions: 'sendParent' },
      SELECT_FOREGROUND: { actions: 'sendParent' },
      SELECT_BACKGROUND: { actions: 'sendParent' },
      RESET_FOREGROUND: { actions: 'sendParent' },
    },
  },
  {
    actions: {
      save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
      restore: assign((_, { tool }) => ({ tool })),
      sendParent: sendParent((_, e) => e),
      spawnTools: assign({
        segmentRef: () => spawn(segmentMachine, 'segment'),
        trackRef: () => spawn(trackMachine, 'track'),
      }),
      addToolsToUndo: pure(({ segmentRef }) => {
        return [sendParent({ type: 'ADD_ACTOR', actor: segmentRef }, { to: 'undo' })];
      }),
    },
  }
);

export default toolMachine;
