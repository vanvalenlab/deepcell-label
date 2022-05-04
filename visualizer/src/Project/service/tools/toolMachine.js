/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createEditLineageMachine from './editLineageMachine';
import createSegmentMachine from './segmentMachine';

const createToolMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'tool',
      context: {
        tool: 'segment',
        eventBuses,
        segmentRef: null,
        editLineageRef: null,
      },
      invoke: [
        { id: 'canvas', src: fromEventBus('tool', () => eventBuses.canvas) },
        { id: 'undo', src: fromEventBus('tool', () => eventBuses.undo) },
        { src: fromEventBus('tool', () => eventBuses.select) },
        { src: fromEventBus('tool', () => eventBuses.load) },
      ],
      initial: 'loading',
      entry: ['spawnTools', 'addToolsToUndo'],
      states: {
        loading: {
          on: {
            LOADED: [{ cond: 'hasLineage', target: 'track' }, { target: 'segment' }],
          },
        },
        checkTool: {
          always: [
            { cond: ({ tool }) => tool === 'track', target: 'track' },
            { target: 'segment' },
          ],
        },
        segment: {
          entry: assign({ tool: 'segment' }),
          on: {
            mouseup: { actions: forwardTo('segment') },
            mousedown: { actions: forwardTo('segment') },
          },
        },
        track: {
          entry: [assign({ tool: 'track' }), send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true })],
          on: {
            mouseup: { actions: forwardTo('track') },
            mousedown: { actions: forwardTo('track') },
          },
        },
      },
      on: {
        SAVE: { actions: 'save' },
        RESTORE: { target: '.checkTool', actions: ['restore', respond('RESTORED')] },

        HOVERING: { actions: [forwardTo('segment'), forwardTo('track')] },
        COORDINATES: { actions: [forwardTo('segment'), forwardTo('track')] },

        SEGMENT: 'segment',
        TRACK: 'track',

        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
      },
    },
    {
      guards: {
        hasLineage: (ctx, evt) => evt.lineage !== null,
      },
      actions: {
        save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
        restore: assign((_, { tool }) => ({ tool })),
        spawnTools: assign((context) => ({
          segmentRef: spawn(createSegmentMachine(context), 'segment'),
          editLineageRef: spawn(createEditLineageMachine(context), 'editLineage'),
        })),
        addToolsToUndo: send(({ segmentRef }) => ({ type: 'ADD_ACTOR', actor: segmentRef }), {
          to: 'undo',
        }),
      },
    }
  );

export default createToolMachine;
