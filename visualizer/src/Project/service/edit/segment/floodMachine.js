import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const creatFloodMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'arrays', src: fromEventBus('flood', () => context.eventBuses.arrays) },
        { src: fromEventBus('flood', () => context.eventBuses.hovering) },
      ],
      context: {
        x: null,
        y: null,
        selected: context.selected,
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
        shift: (_, event) => event.shiftKey,
        onFloodCell: (ctx) => ctx.hovering.includes(ctx.floodCell),
      },
      actions: {
        setSelected: assign({ selected: (_, { selected }) => selected }),
        setFloodCell: assign({
          floodCell: (ctx) => {
            const { hovering, floodCell } = ctx;
            const i = hovering.indexOf(floodCell);
            return i === -1 || i === hovering.length - 1 ? hovering[0] : hovering[i + 1];
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
