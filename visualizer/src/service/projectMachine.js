/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import canvasMachine from './canvasMachine';
import createImageMachine from './imageMachine';
import selectMachine from './selectMachine';
import toolMachine from './tools/toolMachine';
import undoMachine from './undoMachine';

function fetchProject(context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`).then((response) => response.json());
}

const createProjectMachine = (projectId, bucket) =>
  Machine(
    {
      id: `${projectId}`,
      context: {
        projectId,
        bucket,
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
    },
    {
      actions: {
        spawnActors: assign({
          canvasRef: () => spawn(canvasMachine, 'canvas'),
          imageRef: (context) => spawn(createImageMachine(context), 'image'),
          apiRef: (context) => spawn(createApiMachine(context), 'api'),
          selectRef: () => spawn(selectMachine, 'select'),
          toolRef: () => spawn(toolMachine, 'tool'),
        }),
        spawnUndo: assign({
          undoRef: () => spawn(undoMachine, 'undo'),
        }),
        addActorsToUndo: pure((context) => {
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
      },
    }
  );

export default createProjectMachine;
