import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createWatershedMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('watershed', () => context.eventBuses.select) },
        { id: 'arrays', src: fromEventBus('watershed', () => context.eventBuses.arrays) },
        { src: fromEventBus('watershed', () => context.eventBuses.hovering) },
      ],
      context: {
        x: 0,
        y: 0,
        hovering: null,
        selected: context.selected,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        SELECTED: { actions: 'setSelected' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              {
                cond: 'onSelected',
                target: 'clicked',
                actions: 'setFirstPoint',
              },
              {
                target: 'switchSelected',
                actions: ['select', 'setFirstPoint'],
              },
            ],
          },
        },
        switchSelected: {
          on: {
            SELECTED: { target: 'clicked', actions: 'setSelected' },
          },
        },
        clicked: {
          on: {
            EXIT: 'idle',
            SELECTED: { cond: 'differentCell', actions: 'setSelected', target: 'idle' },
            mouseup: [
              {
                cond: 'validSecondSeed',
                target: 'waiting',
                actions: ['setSecondPoint', 'watershed', 'newBackground'],
              },
              {
                cond: 'notOnSelected',
                target: 'switchSelected',
                actions: ['select', 'setFirstPoint'],
              },
            ],
          },
        },
        waiting: {
          on: {
            EDITED_SEGMENT: 'idle',
          },
          after: {
            1000: 'idle',
          },
        },
      },
    },
    {
      guards: {
        validSecondSeed: (ctx) =>
          ctx.hovering.includes(ctx.label) && // same label
          (ctx.x !== ctx.x1 || ctx.y !== ctx.y2), // different point
        differentCell: (ctx, evt) => ctx.selected !== evt.selected,
        onSelected: (ctx) => ctx.hovering.includes(ctx.selected),
        notOnSelected: (ctx) => ctx.hovering.includes(ctx.selected),
        onNoCell: (ctx) => ctx.hovering.length === 0,
      },
      actions: {
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setFirstPoint: assign({ x1: (ctx) => ctx.x, y1: (ctx) => ctx.y }),
        setSecondPoint: assign({ x2: (ctx) => ctx.x, y2: (ctx) => ctx.y }),
        setSelected: assign({ selected: (ctx) => ctx.selected }),
        select: send('SELECT', { to: 'select' }),
        watershed: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'watershed',
            args: {
              label: ctx.selected,
              x1: ctx.x1,
              y1: ctx.y1,
              x2: ctx.x2,
              y2: ctx.y2,
            },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createWatershedMachine;
