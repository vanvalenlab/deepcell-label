import { assign, Machine, send } from 'xstate';
import { apiEventBus } from '../../apiMachine';
import { canvasEventBus } from '../../canvasMachine';
import { fromEventBus } from '../../eventBus';
import { selectedCellsEventBus } from '../../selectMachine';
import { toolActions, toolGuards } from './toolUtils';

const thresholdMachine = Machine(
  {
    initial: 'idle',
    invoke: [
      { src: fromEventBus('threshold', () => canvasEventBus) },
      { src: fromEventBus('threshold', () => selectedCellsEventBus) },
      { id: 'api', src: fromEventBus('threshold', () => apiEventBus) },
    ],
    context: {
      x: null,
      y: null,
      foreground: null,
      firstPoint: [null, null],
    },
    states: {
      idle: {
        on: {
          EXIT: 'idle',
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
      COORDINATES: { actions: 'setCoordinates' },
      FOREGROUND: { actions: 'setForeground' },
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      saveFirstPoint: assign({ firstPoint: ({ x, y }) => [x, y] }),
      threshold: send(
        ({ foreground, firstPoint, x, y }, event) => ({
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
        }),
        { to: 'api' }
      ),
    },
  }
);

export default thresholdMachine;
