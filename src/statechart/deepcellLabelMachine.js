/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign, forwardTo, send, spawn } from 'xstate';
import createImageMachine from './imageMachine';
import canvasMachine from './canvasMachine';
import { pure } from 'xstate/lib/actions';
// toolMachine from './toolMachine';
// import apiMachine from './apiMachine';
// import undoMachine from './undoMachine';
import selectMachine from './selectMachine';


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
    // invoke: [
    //   {
    //     id: 'image',
    //     src: createImageMachine,
    //   },
    //   {
    //     id: 'canvas',
    //     src: canvasMachine,
    //   },
    //   // {
    //   //   id: 'tool',
    //   //   src: toolMachine,
    //   // },
    //   // {
    //   //   id: 'undo',
    //   //   src: undoMachine,
    //   // },
    //   // {
    //   //   id: 'api',
    //   //   src: apiMachine,
    //   // },
    // ],
    entry: ['spawnActors', 'sendActorRefs'],
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          src: fetchProject,
          onDone: {
            target: 'idle',
            actions: [
              'sendProject',
              assign((context, event) => event.data),
              (context, event) => console.log(event.data)
            ]
          },
        }
      },
      // spawning: {
      //   entry: assign({
      //     imageRef: (context) => spawn(createImageMachine(context), 'image'),
      //     canvasRef: (context) => spawn(createCanvasMachine(context), 'canvas'),
      //   }),
      //   always: {
      //     target: 'idle',
      //     actions: [
      //       'sendCanvasRef',
      //     ],
      //   }
      // },
      idle: {},
      // idle: {
      //   on: {
      //     LOADING: 'loading',
      //     EDIT: { actions: ['saveTool', 'edit', 'recordContext'] },
      //   }
      // },
      // loading: {
      //   on: {
      //     LOADED: 'idle',
      //     ERROR: 'idle',
      //   }
      // },
    },
  },
  {
    actions: {
      spawnActors: assign({
        canvasRef: () => spawn(canvasMachine, 'canvas'),
        imageRef: (context) => spawn(createImageMachine(context), 'image'),
        selectRef: () => spawn(selectMachine, 'select'),
      }),
      sendActorRefs: pure((context, event) => {
        const sendSelectToImage = send(
          { type: 'SELECTREF', selectRef: context.selectRef },
          { to: context.imageRef }
        );
        const sendSelectToCanvas = send(
          { type: 'SELECTREF', selectRef: context.selectRef },
          { to: context.canvasRef }
        );
        return [sendSelectToImage, sendSelectToCanvas];
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
