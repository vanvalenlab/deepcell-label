import { assign, Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createBrushMachine = () =>
  Machine(
    {
      invoke: {
        src: 'listenForBrushHotkeys',
      },
      context: {
        x: null,
        y: null,
        foreground: null,
        background: null,
        trace: [],
        brushSize: 5,
      },
      initial: 'idle',
      states: {
        idle: {
          entry: assign({ trace: [] }),
          on: {
            mousedown: [{ cond: 'shift' }, { target: 'dragging', actions: 'addToTrace' }],
          },
        },
        dragging: {
          on: {
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
        EXIT: '.idle',
        INCREASE_BRUSH_SIZE: { actions: 'increaseBrushSize' },
        DECREASE_BRUSH_SIZE: { actions: 'decreaseBrushSize' },
        COORDINATES: { actions: 'setCoordinates' },
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
      },
    },
    {
      services: {
        listenForBrushHotkeys: () => send => {
          const lookup = {
            ArrowUp: 'INCREASE_BRUSH_SIZE',
            ArrowDown: 'DECREASE_BRUSH_SIZE',
          };
          const listener = e => {
            if (e.key in lookup) {
              e.preventDefault();
              send(lookup[e.key]);
            }
          };
          window.addEventListener('keydown', listener);
          return () => window.removeEventListener('keydown', listener);
        },
      },
      guards: toolGuards,
      actions: {
        ...toolActions,
        increaseBrushSize: assign({
          brushSize: ({ brushSize }) => brushSize + 1,
        }),
        decreaseBrushSize: assign({
          brushSize: ({ brushSize }) => Math.max(1, brushSize - 1),
        }),
        addToTrace: assign({ trace: ({ trace, x, y }) => [...trace, [x, y]] }),
        paint: sendParent(context => ({
          type: 'EDIT',
          action: 'handle_draw',
          args: {
            trace: JSON.stringify(context.trace),
            foreground: context.foreground,
            background: context.background,
            brush_size: context.brushSize,
          },
        })),
      },
    }
  );

export default createBrushMachine;
