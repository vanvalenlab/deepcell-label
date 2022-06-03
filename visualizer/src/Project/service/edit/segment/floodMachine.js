import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const creatFloodMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select, 'SELECTED') },
        { src: fromEventBus('flood', () => context.eventBuses.hovering, 'HOVERING') },
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        { id: 'arrays', src: fromEventBus('flood', () => context.eventBuses.arrays, []) },
      ],
      context: {
        x: null,
        y: null,
        selected: null,
        floodCell: 0,
        hovering: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          { cond: 'shift', actions: 'setFloodCell' },
          { cond: 'onFloodCell', actions: 'flood' },
          { actions: 'setFloodCell' },
        ],
      },
    },
    {
      guards: {
        shift: (_, evt) => evt.shiftKey,
        onFloodCell: (ctx) => ctx.hovering.includes(ctx.floodCell),
      },
      actions: {
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setFloodCell: assign({
          floodCell: (ctx) => {
            const { hovering, floodCell } = ctx;
            const i = hovering.indexOf(floodCell);
            if (i === -1) {
              return hovering[0];
            } else if (i === hovering.length - 1) {
              return 0;
            } else {
              return hovering[i + 1];
            }
          },
        }),
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        flood: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              foreground: ctx.selected,
              background: ctx.floodCell,
              x: ctx.x,
              y: ctx.y,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default creatFloodMachine;
