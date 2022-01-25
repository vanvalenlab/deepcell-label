/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import createCanvasMachine from './canvasMachine';
import { EventBus } from './eventBus';
import createImageMachine from './imageMachine';
import createSelectMachine from './selectMachine';
import createToolMachine from './tools/toolMachine';
import createUndoMachine from './undoMachine';

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
        eventBuses: {
          canvas: new EventBus('canvas'),
          image: new EventBus('image'),
          labeled: new EventBus('labeled'),
          raw: new EventBus('raw'),
          select: new EventBus('select'),
          undo: new EventBus('undo'),
          api: new EventBus('api'),
        },
      },
      initial: 'setUpActors',
      states: {
        setUpActors: {
          entry: 'spawnActors',
          always: 'setUpUndo',
        },
        setUpUndo: {
          entry: 'addActorsToUndo',
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
        spawnActors: assign((context) => {
          console.log(context);
          return {
            canvasRef: spawn(createCanvasMachine(context), 'canvas'),
            imageRef: spawn(createImageMachine(context), 'image'),
            apiRef: spawn(createApiMachine(context), 'api'),
            selectRef: spawn(createSelectMachine(context), 'select'),
            toolRef: spawn(createToolMachine(context), 'tool'),
            undoRef: spawn(createUndoMachine(context), 'undo'),
          };
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
