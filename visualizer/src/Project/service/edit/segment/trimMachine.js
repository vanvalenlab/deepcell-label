import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createTrimMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('trim', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('trim', () => context.eventBuses.hovering, 'HOVERING') },
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        { id: 'arrays', src: fromEventBus('trim', () => context.eventBuses.arrays, []) },
      ],
      context: {
        x: null,
        y: null,
        hovering: null,
        cell: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        SELECTED: { actions: 'setCell' },
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
        setCell: assign({ cell: (_, evt) => evt.selected }),
        select: send({ type: 'SELECT' }, { to: 'select' }),
        trim: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'trim_pixels',
            args: {
              cell: ctx.cell,
              x: ctx.x,
              y: ctx.y,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createTrimMachine;
