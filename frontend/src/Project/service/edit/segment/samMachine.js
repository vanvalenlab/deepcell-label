/** Manages using the brush tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createSAMMachine = (context) =>
Machine(
    {
      invoke: [
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        { id: 'arrays', src: fromEventBus('sam', () => context.eventBuses.arrays, ['EDITED_SEGMENT']) },
      ],
      context: {
        isMouseDown: false,
        startX: null,
        startY: null,
        endX: null,
        endY: null,
        x: 0,
        y: 0,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mousedown: { target: 'dragging', actions: ['setStartCoordinates', 'setMouseIsDown'] },
          },
        },
        dragging: {
          on: {
            EXIT: 'idle',
            COORDINATES: { actions: ['setCoordinates'] },
            mouseup: { target: 'waiting', actions: ['setMouseIsNotDown', 'setEndCoordinates'] },
          },
        },
        waiting: {
            on: {
                CLEAR_SELECTION: { target: 'done', actions: ['clearSelection']},
                SEND_TO_API: {target: "fetching", actions: ["sendToAPI"]}
            },
        },
        fetching: {
            on: {
              EDITED_SEGMENT: { target: 'done', actions: ['clearSelection'] },
            }
        },
        done: {
          always: 'idle',
        },
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
      },
    },
    {
      actions: {
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setStartCoordinates: assign({ startX: (ctx) => ctx.x, startY: (ctx) => ctx.y }),
        setEndCoordinates: assign({ endX: (ctx) => ctx.x, endY: (ctx) => ctx.y }),
        setMouseIsDown: assign({ isMouseDown: true }),
        setMouseIsNotDown: assign({ isMouseDown: false }),
        clearSelection: assign({ startX: null, startY: null, endX: null, endY: null, isMouseDown: false, x: 0, y: 0 }),
        sendToAPI: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'sam',
            args: {
              x_start: ctx.startX,
              y_start: ctx.startY,
              x_end: ctx.endX,
              y_end: ctx.endY,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createSAMMachine;
