import { Machine, actions, assign, forwardTo, send, sendParent } from 'xstate';

const selectMachine = Machine(
  {
    id: 'select',
    context: {
      labeledArray: [[undefined]],
      x: 0,
      y: 0,
      label: undefined,
      foreground: undefined,
      background: undefined,
    },
    initial: 'idle',
    states: {
      idle: {}
    },
    on: {
      LABELEDARRAY: { actions: ['updateLabeled', (context, event) => console.log(event)] },
      COORDINATES: { actions: [ 'updateCoordinates', (context, event) => console.log(event)] },
    }
  },
  {
    actions: {
      updateLabeled: assign((context, event) => ({
        labeledArray: event.labeledArray,
        label: event.labeledArray[context.y][context.x],
      })),
      updateCoordinates: assign((context, event) => ({
        x: event.x,
        y: event.y,
        label: context.labeledArray[event.y][event.x],
      })),
    },
  },
);

export default selectMachine;
