/** Manages using the brush tool. */
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createBrushMachine = (context) =>
  Machine(
    {
      invoke: [
        { src: 'listenForBrushHotkeys' },
        { src: fromEventBus('brush', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        { id: 'arrays', src: fromEventBus('brush', () => context.eventBuses.arrays, []) },
      ],
      context: {
        x: 0,
        y: 0,
        cell: null,
        trace: [],
        brushSize: 5,
        erase: false,
      },
      initial: 'idle',
      states: {
        idle: {
          entry: assign({ trace: [] }),
          on: {
            mousedown: { target: 'dragging', actions: 'addToTrace' },
          },
        },
        dragging: {
          on: {
            EXIT: 'idle',
            COORDINATES: { actions: ['setCoordinates', 'addToTrace'] },
            mouseup: { target: 'done', actions: 'paint' },
          },
        },
        // needed avoid sending empty trace in EDIT event
        done: {
          always: 'idle',
        },
      },
      on: {
        SET_ERASE: { actions: 'setErase' },
        INCREASE_BRUSH_SIZE: { actions: 'increaseBrushSize' },
        DECREASE_BRUSH_SIZE: { actions: 'decreaseBrushSize' },
        COORDINATES: { actions: 'setCoordinates' },
        SELECTED: { actions: 'setCell' },
      },
    },
    {
      services: {
        listenForBrushHotkeys: () => (send) => {
          const lookup = {
            ArrowUp: 'INCREASE_BRUSH_SIZE',
            ArrowDown: 'DECREASE_BRUSH_SIZE',
          };
          const listener = (e) => {
            if (e.key in lookup) {
              e.preventDefault();
              send(lookup[e.key]);
            }
          };
          window.addEventListener('keydown', listener);
          return () => window.removeEventListener('keydown', listener);
        },
      },
      actions: {
        setErase: assign({ erase: (_, evt) => evt.erase }),
        setCell: assign({ cell: (_, evt) => evt.selected }),
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        increaseBrushSize: assign({
          brushSize: (ctx) => ctx.brushSize + 1,
        }),
        decreaseBrushSize: assign({
          brushSize: (ctx) => Math.max(1, ctx.brushSize - 1),
        }),
        addToTrace: assign({ trace: (ctx) => [...ctx.trace, [ctx.x, ctx.y]] }),
        paint: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'draw',
            args: {
              trace: JSON.stringify(ctx.trace),
              cell: ctx.cell,
              brush_size: ctx.brushSize,
              erase: ctx.erase,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createBrushMachine;
