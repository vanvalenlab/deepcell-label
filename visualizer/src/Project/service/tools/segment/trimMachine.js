import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createTrimMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('trim', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('trim', () => context.eventBuses.api) },
        { src: fromEventBus('trim', () => context.eventBuses.overlaps) },
      ],
      context: {
        x: null,
        y: null,
        hovering: null,
        label: context.selected,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        SELECTED: { actions: 'setLabel' },
        OVERLAPS: { actions: 'setOverlaps' },
        mouseup: [{ cond: 'onLabel', actions: 'trim' }, { actions: 'select' }],
      },
    },
    {
      guards: {
        onLabel: ({ label, hovering, overlaps }) => overlaps[hovering][label] === 1,
      },
      actions: {
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setLabel: assign({ label: (_, { selected }) => selected }),
        setOverlaps: assign({ overlaps: (_, { overlaps }) => overlaps }),
        select: send({ type: 'SELECT' }, { to: 'select' }),
        trim: send(
          ({ x, y, label }, event) => ({
            type: 'EDIT',
            action: 'trim_pixels',
            args: {
              label,
              x,
              y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createTrimMachine;
