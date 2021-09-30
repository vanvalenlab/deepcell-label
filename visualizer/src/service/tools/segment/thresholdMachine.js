import { assign, Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const thresholdMachine = Machine(
  {
    initial: 'idle',
    context: {
      x: null,
      y: null,
      foreground: null,
      firstPoint: [null, null],
    },
    states: {
      idle: {
        on: {
          mousedown: { target: 'dragging', actions: 'saveFirstPoint' },
        },
      },
      dragging: {
        on: {
          mouseup: { target: 'idle', actions: 'threshold' },
        },
      },
    },
    on: {
      EXIT: '.idle',
      COORDINATES: { actions: 'setCoordinates' },
      FOREGROUND: { actions: 'setForeground' },
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      saveFirstPoint: assign({ firstPoint: ({ x, y }) => [x, y] }),
      threshold: sendParent(({ foreground, firstPoint, x, y }, event) => ({
        type: 'EDIT',
        action: 'threshold',
        args: {
          x1: firstPoint[0],
          y1: firstPoint[1],
          x2: x,
          y2: y,
          // frame: context.frame,
          label: foreground,
        },
      })),
    },
  }
);

export default thresholdMachine;
