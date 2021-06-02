/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign, forwardTo, send, spawn } from 'xstate';
import createImageMachine from './imageMachine';
import canvasMachine from './canvasMachine';
import { pure } from 'xstate/lib/actions';
import toolMachine from './toolMachine';
import createApiMachine from './apiMachine';
import undoMachine from './undoMachine';


function fetchProject(context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`)
    .then(response => response.json());
}

const createDeepcellLabelMachine = (projectId) => Machine(
  {
    id: 'deepcellLabel',
    context: {
      projectId,
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
            actions: [
              'sendProject',
              assign((context, event) => event.data),
            ]
          },
          onError: {
            target: 'idle',
            actions: (context, event) => console.log(event),
          }
        }
      },
      idle: {},
    },
    on: {
      EDIT: { actions: [forwardTo('api'), forwardTo('undo')] },
      BACKENDUNDO: { actions: forwardTo('api') },
      BACKENDREDO: { actions: forwardTo('api') },
      EDITED: { actions: forwardTo('image') },
    }
  },
  {
    actions: {
      spawnActors: assign({
        canvasRef: () => spawn(canvasMachine, 'canvas'),
        imageRef: (context) => spawn(createImageMachine(context), 'image'),
        toolRef: () => spawn(toolMachine, 'tool'),
        apiRef: (context) => spawn(createApiMachine(context), 'api'),
      }),
      sendActorRefs: pure((context, event) => {
        const sendToolToImage = send(
          { type: 'TOOLREF', toolRef: context.toolRef },
          { to: context.imageRef }
        );
        const sendToolToCanvas = send(
          { type: 'TOOLREF', toolRef: context.toolRef },
          { to: context.canvasRef }
        );
        return [sendToolToImage, sendToolToCanvas];
      }),
      spawnUndo: assign({
        undoRef: (context) => spawn(undoMachine, 'undo'),
      }), 
      addActorsToUndo: pure((context) => {
        const { canvasRef, toolRef, imageRef } = context;
        return [
          send({ type: 'ADD_ACTOR', actor: canvasRef }, { to: 'undo' }),
        ];
      }),
      sendProject: pure((context, event) => {
        const sendToCanvas = send((context, event) => ({ type: 'PROJECT', ...event.data }), { to: 'canvas' });
        const sendToImage = send((context, event) => ({ type: 'PROJECT', ...event.data }), { to: 'image' });
        // const sendToSelect = send((context, event) => ({ type: 'PROJECT', ...event.data }), { to: 'select' });
        return [sendToCanvas, sendToImage];
      })
      // edit: forwardTo('api'),
      // saveTool: assign({ tool: (context, event) => event.tool }),
      // recordContext: send('STORE', { to: 'undo' } ),
      // forwardToTool: forwardTo('tool'),
    }
  }
);

export default createDeepcellLabelMachine;
