import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createBrushMachine = (context) =>
  Machine(
    {
      invoke: [
        { src: 'listenForBrushHotkeys' },
        { src: fromEventBus('brush', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('brush', () => context.eventBuses.api) },
      ],
      context: {
        x: 0,
        y: 0,
        label: context.selected,
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
        SELECTED: { actions: 'setLabel' },
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
        setErase: assign({ erase: (ctx, e) => e.erase }),
        setLabel: assign({ label: (_, { selected }) => selected }),
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        increaseBrushSize: assign({
          brushSize: ({ brushSize }) => brushSize + 1,
        }),
        decreaseBrushSize: assign({
          brushSize: ({ brushSize }) => Math.max(1, brushSize - 1),
        }),
        addToTrace: assign({ trace: ({ trace, x, y }) => [...trace, [x, y]] }),
        paint: send(
          (context) => ({
            type: 'EDIT',
            action: 'draw',
            args: {
              trace: JSON.stringify(context.trace),
              label: context.label,
              brush_size: context.brushSize,
              erase: context.erase,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createBrushMachine;
