/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import canvasMachine from './canvasMachine';
import createImageMachine from './imageMachine';
import selectMachine from './selectMachine';
import toolMachine from './tools/toolMachine';
import undoMachine from './undoMachine';

function fetchProject(context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`).then(response => response.json());
}

const createProjectMachine = (projectId, bucket) =>
  Machine(
    {
      id: `${projectId}`,
      context: {
        projectId,
        bucket,
        frame: 0,
        feature: 0,
        channel: 0,
      },
      initial: 'setUpActors',
      states: {
        setUpActors: {
          entry: 'spawnActors',
          always: 'setUpUndo',
        },
        setUpUndo: {
          entry: ['spawnUndo', 'addActorsToUndo'],
          always: 'loading',
        },
        loading: {
          invoke: {
            src: fetchProject,
            onDone: {
              target: 'idle',
              actions: 'sendProject',
            },
            onError: {
              target: 'idle',
              actions: (context, event) => console.log(event),
            },
          },
        },
        idle: {},
      },
      on: {
        // from various
        ADD_ACTOR: { actions: forwardTo('undo') },
        EDIT: { actions: ['dispatchEdit', forwardTo('undo')] },

        // from image
        FRAME: { actions: 'setFrame' },
        CHANNEL: { actions: 'setChannel' },
        FEATURE: { actions: 'setFeature' },
        GRAYSCALE: { actions: forwardTo('tool') },
        COLOR: { actions: forwardTo('tool') },
        LABELED_ARRAY: { actions: forwardTo('canvas') },
        LABELS: { actions: [forwardTo('tool'), forwardTo('select')] },

        // from canvas
        HOVERING: { actions: [forwardTo('tool'), forwardTo('select')] },
        COORDINATES: { actions: forwardTo('tool') },
        FOREGROUND: { actions: forwardTo('tool') },
        BACKGROUND: { actions: forwardTo('tool') },
        SELECTED: { actions: forwardTo('tool') },
        mouseup: { actions: forwardTo('tool') },
        mousedown: { actions: forwardTo('tool') },
        mousemove: { actions: forwardTo('tool') },

        // from undo
        BACKEND_UNDO: { actions: forwardTo('api') },
        BACKEND_REDO: { actions: forwardTo('api') },

        // from api
        EDITED: { actions: forwardTo('image') },

        // from tool
        SET_PAN_ON_DRAG: { actions: forwardTo('canvas') },
        SET_FOREGROUND: { actions: forwardTo('select') },
        SELECT_FOREGROUND: { actions: forwardTo('select') },
        SELECT_BACKGROUND: { actions: forwardTo('select') },
        RESET_FOREGROUND: { actions: forwardTo('select') },
      },
    },
    {
      actions: {
        spawnActors: assign({
          canvasRef: () => spawn(canvasMachine, 'canvas'),
          imageRef: context => spawn(createImageMachine(context), 'image'),
          apiRef: context => spawn(createApiMachine(context), 'api'),
          selectRef: () => spawn(selectMachine, 'select'),
          toolRef: () => spawn(toolMachine, 'tool'),
        }),
        spawnUndo: assign({
          undoRef: () => spawn(undoMachine, 'undo'),
        }),
        addActorsToUndo: pure(context => {
          const { canvasRef, toolRef, imageRef, selectRef } = context;
          return [
            send({ type: 'ADD_ACTOR', actor: canvasRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: imageRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: toolRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: selectRef }, { to: 'undo' }),
          ];
        }),
        sendProject: pure((context, event) => {
          const projectEvent = { type: 'PROJECT', ...event.data };
          return [send(projectEvent, { to: 'canvas' }), send(projectEvent, { to: 'image' })];
        }),
        dispatchEdit: send(
          ({ frame, feature, channel }, e) => ({
            ...e,
            args: { ...e.args, frame, feature, channel },
          }),
          { to: 'api' }
        ),
        setFrame: assign((_, { frame }) => ({ frame })),
        setFeature: assign((_, { feature }) => ({ feature })),
        setChannel: assign((_, { channel }) => ({ channel })),
      },
    }
  );

export default createProjectMachine;
