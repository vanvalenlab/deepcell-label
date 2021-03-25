/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign, forwardTo, send } from 'xstate';
import createImageMachine from './imageMachine';
import canvasMachine from './canvasMachine';
// toolMachine from './toolMachine';
// import apiMachine from './apiMachine';
// import undoMachine from './undoMachine';


const createDeepcellLabelMachine = (projectId) => Machine(
  {
    id: 'deepcellLabel',
    context: {
      projectId,
    },
    invoke: [
      {
        id: 'image',
        src: createImageMachine,
      },
      {
        id: 'canvas',
        src: canvasMachine,
      },
      // {
      //   id: 'tool',
      //   src: toolMachine,
      // },
      // {
      //   id: 'undo',
      //   src: undoMachine,
      // },
      // {
      //   id: 'api',
      //   src: apiMachine,
      // },
    ],
    initial: 'idle',
    states: {
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
      // edit: forwardTo('api'),
      // saveTool: assign({ tool: (context, event) => event.tool }),
      // recordContext: send('STORE', { to: 'undo' } ),
      // forwardToTool: forwardTo('tool'),
    }
  }
);

export default createDeepcellLabelMachine;
