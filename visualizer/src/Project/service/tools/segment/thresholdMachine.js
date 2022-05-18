import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createThresholdMachine = (context) =>
  Machine(
    {
      initial: 'idle',
      invoke: [
        { src: fromEventBus('threshold', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('threshold', () => context.eventBuses.api) },
      ],
      context: {
        x: null,
        y: null,
        label: context.selected,
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
        SELECTED: { actions: 'setLabel' },
      },
    },
    {
      guards: {},
      actions: {
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setLabel: assign({ label: (_, { selected }) => selected }),
        setFirstPoint: assign({ firstPoint: ({ x, y }) => [x, y] }),
        threshold: send(
          ({ label, firstPoint, x, y }, event) => ({
            type: 'EDIT',
            action: 'threshold',
            args: {
              x1: firstPoint[0],
              y1: firstPoint[1],
              x2: x,
              y2: y,
              label,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createThresholdMachine;
