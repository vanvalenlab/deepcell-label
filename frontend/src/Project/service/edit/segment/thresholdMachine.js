/** Manages using the threshold tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createThresholdMachine = (context) =>
  Machine(
    {
      initial: 'idle',
      invoke: [
        { src: fromEventBus('threshold', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        { id: 'arrays', src: fromEventBus('threshold', () => context.eventBuses.arrays, []) },
      ],
      context: {
        x: null,
        y: null,
        selected: null,
        firstPoint: [null, null],
      },
      states: {
        idle: {
          on: {
            EXIT: 'idle',
            mousedown: { target: 'dragging', actions: 'setFirstPoint' },
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
        SELECTED: { actions: 'setSelected' },
      },
    },
    {
      guards: {},
      actions: {
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setFirstPoint: assign({ firstPoint: (ctx) => [ctx.x, ctx.y] }),
        threshold: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'threshold',
            args: {
              x1: ctx.firstPoint[0],
              y1: ctx.firstPoint[1],
              x2: ctx.x,
              y2: ctx.y,
              cell: ctx.selected,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createThresholdMachine;
