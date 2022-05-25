import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createTrimMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('trim', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('trim', () => context.eventBuses.api) },
        { src: fromEventBus('trim', () => context.eventBuses.hovering) },
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
        mouseup: [{ cond: 'onLabel', actions: 'trim' }, { actions: 'select' }],
      },
    },
    {
      guards: {
        onLabel: (ctx) => ctx.hovering.includes(ctx.label),
      },
      actions: {
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setLabel: assign({ label: (_, evt) => evt.selected }),
        select: send({ type: 'SELECT' }, { to: 'select' }),
        trim: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'trim_pixels',
            args: {
              label: ctx.label,
              x: ctx.x,
              y: ctx.y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createTrimMachine;
