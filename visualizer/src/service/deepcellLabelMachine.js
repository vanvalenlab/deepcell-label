/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import canvasMachine from './canvasMachine';
import createImageMachine from './imageMachine';
import toolMachine from './toolMachine';
import undoMachine from './undoMachine';

function fetchProject(context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`).then(response => response.json());
}

const createDeepcellLabelMachine = (projectId, bucket) =>
  Machine(
    {
      id: 'deepcellLabel',
      context: {
        projectId,
        bucket,
      },
      initial: 'setUpActors',
      states: {
        setUpActors: {
          entry: ['spawnActors', 'sendActorRefs'],
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
        EDIT: { actions: [forwardTo('api'), forwardTo('undo')] },
        BACKEND_UNDO: { actions: forwardTo('api') },
        BACKEND_REDO: { actions: forwardTo('api') },
        EDITED: { actions: forwardTo('image') },
        ADD_ACTOR: {
          actions: send((_, { actor }) => ({ type: 'ADD_ACTOR', actor }), {
            to: 'undo',
          }),
        },
        TOOL: { actions: forwardTo('canvas') },
      },
    },
    {
      actions: {
        spawnActors: assign({
          canvasRef: () => spawn(canvasMachine, 'canvas'),
          imageRef: context => spawn(createImageMachine(context), 'image'),
          toolRef: () => spawn(toolMachine, 'tool'),
          apiRef: context => spawn(createApiMachine(context), 'api'),
        }),
        sendActorRefs: pure(({ toolRef }) => {
          return [
            send({ type: 'TOOL_REF', toolRef }, { to: 'image' }),
            send({ type: 'TOOL_REF', toolRef }, { to: 'canvas' }),
          ];
        }),
        spawnUndo: assign({
          undoRef: () => spawn(undoMachine, 'undo'),
        }),
        addActorsToUndo: pure(context => {
          const { canvasRef, toolRef, imageRef } = context;
          return [
            send({ type: 'ADD_ACTOR', actor: canvasRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: imageRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: toolRef }, { to: 'undo' }),
          ];
        }),
        sendProject: pure((context, event) => {
          const projectEvent = { type: 'PROJECT', ...event.data };
          return [
            send(projectEvent, { to: 'canvas' }),
            send(projectEvent, { to: 'image' }),
          ];
        }),
      },
    }
  );

export default createDeepcellLabelMachine;
