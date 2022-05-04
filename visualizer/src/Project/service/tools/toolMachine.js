/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createSegmentMachine from './segmentMachine';
import createTrackMachine from './trackMachine';

const createToolMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'tool',
      context: {
        tool: 'segment',
        eventBuses,
        segmentRef: null,
        trackRef: null,
      },
      invoke: [
        { id: 'canvas', src: fromEventBus('tool', () => eventBuses.canvas) },
        { id: 'undo', src: fromEventBus('tool', () => eventBuses.undo) },
        { src: fromEventBus('tool', () => eventBuses.select) },
      ],
      initial: 'checkTool',
      entry: ['spawnTools', 'addToolsToUndo', 'checkTrack'],
      states: {
        checkTool: {
          always: [
            { cond: ({ tool }) => tool === 'track', target: 'track' },
            { target: 'segment' },
          ],
        },
        segment: {
          on: {
            mouseup: { actions: forwardTo('segment') },
            mousedown: { actions: forwardTo('segment') },
          },
        },
        track: {
          entry: send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
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

        SEGMENT: { target: '.checkTool', actions: assign({ tool: 'segment' }) },
        TRACK: { target: '.checkTool', actions: assign({ tool: 'track' }) },

        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
      },
    },
    {
      actions: {
        save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
        restore: assign((_, { tool }) => ({ tool })),
        spawnTools: assign((context) => ({
          segmentRef: spawn(createSegmentMachine(context), 'segment'),
          trackRef: spawn(createTrackMachine(context), 'track'),
        })),
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

export default createToolMachine;
