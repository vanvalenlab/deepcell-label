/** Manages using the watershed tool. */
import { assign, Machine, send } from 'xstate';
import Cells from '../../../cells';
import { fromEventBus } from '../../eventBus';

const createWatershedMachine = (context) =>
  Machine(
    {
      invoke: [
        {
          id: 'select',
          src: fromEventBus('watershed', () => context.eventBuses.select, 'SELECTED'),
        },
        { src: fromEventBus('watershed', () => context.eventBuses.hovering, 'HOVERING') },
        { src: fromEventBus('watershed', () => context.eventBuses.canvas, 'COORDINATES') },
        {
          id: 'arrays',
          src: fromEventBus('watershed', () => context.eventBuses.arrays, 'EDITED_SEGMENT'),
        },
        { src: fromEventBus('watershed', () => context.eventBuses.cells, 'CELLS') },
      ],
      context: {
        x: 0,
        y: 0,
        hovering: null,
        cell: null,
        newCell: null,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        SELECTED: { actions: 'setCell' },
        CELLS: { actions: 'setNewCell' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              {
                cond: 'onCell',
                target: 'clicked',
                actions: 'setFirstPoint',
              },
              {
                target: 'switchCell',
                actions: ['select', 'setFirstPoint'],
              },
            ],
          },
        },
        switchCell: {
          on: {
            SELECTED: { target: 'clicked', actions: 'setCell' },
          },
        },
        clicked: {
          on: {
            EXIT: 'idle',
            SELECTED: { cond: 'differentCell', actions: 'setCell', target: 'idle' },
            mouseup: [
              {
                cond: 'validSecondSeed',
                target: 'waiting',
                actions: ['setSecondPoint', 'watershed'],
              },
              {
                cond: 'notOnCell',
                target: 'switchCell',
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
          ctx.hovering.includes(ctx.cell) && // same cell
          (ctx.x !== ctx.x1 || ctx.y !== ctx.y2), // different point
        differentCell: (ctx, evt) => ctx.cell !== evt.selected,
        onCell: (ctx) => ctx.hovering.includes(ctx.cell),
        notOnCell: (ctx) => !ctx.hovering.includes(ctx.cell),
        onNoCell: (ctx) => ctx.hovering.length === 0,
      },
      actions: {
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        setFirstPoint: assign({ x1: (ctx) => ctx.x, y1: (ctx) => ctx.y }),
        setSecondPoint: assign({ x2: (ctx) => ctx.x, y2: (ctx) => ctx.y }),
        setCell: assign({ cell: (_, evt) => evt.selected }),
        setNewCell: assign({ newCell: (_, evt) => new Cells(evt.cells).getNewCell() }),
        select: send('SELECT', { to: 'select' }),
        watershed: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'watershed',
            args: {
              cell: ctx.cell,
              new_cell: ctx.newCell,
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
