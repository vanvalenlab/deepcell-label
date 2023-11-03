/** Manages using the brush tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

async function sendToSamAPI(ctx) {
    const id = new URLSearchParams(window.location.search).get('projectId')
    console.log("SHOULD SEND TO API", ctx)
    const options = {
        method: 'POST',
        body: JSON.stringify(ctx),
        'Content-Type': 'application/json',
        };
    const response = await fetch(`${document.location.origin}/api/sendToSam/${id}`, options)
    const data = await response.json()

    await new Promise(r => setTimeout(r, 4000))

    return data
}

const createSAMMachine = (context) =>
Machine(
    {
      invoke: [
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
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
                SEND_TO_API: { target: "fetching" }
            },
        },
        fetching: {
            invoke: {
                src: sendToSamAPI,
                onDone: {
                    target: 'done',
                    actions: ['clearSelection']
                },
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
      },
    }
  );

export default createSAMMachine;
