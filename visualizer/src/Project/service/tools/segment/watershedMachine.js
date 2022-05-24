import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createWatershedMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('watershed', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('watershed', () => context.eventBuses.api) },
        { src: fromEventBus('watershed', () => context.eventBuses.cells) },
      ],
      context: {
        x: 0,
        y: 0,
        hovering: null,
        label: context.selected,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        cellMatrix: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        CELL_MATRIX: { actions: 'setCellMatrix' },
        SELECTED: { actions: 'setLabel' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: [
              { cond: 'onNoLabel' },
              {
                cond: 'onLabel',
                target: 'clicked',
                actions: ['setFirstPoint', 'setLabel'],
              },
              {
                target: 'switchLabel',
                actions: ['select', 'setFirstPoint'],
              },
            ],
          },
        },
        switchLabel: {
          on: {
            SELECTED: { target: 'clicked', actions: ['setLabel'] },
          },
        },
        clicked: {
          on: {
            EXIT: 'idle',
            SELECTED: { cond: 'differentLabel', actions: 'setLabel', target: 'idle' },
            mouseup: [
              {
                cond: 'validSecondSeed',
                target: 'waiting',
                actions: ['setSecondPoint', 'watershed', 'newBackground'],
              },
              {
                cond: 'notOnLabel',
                target: 'switchLabel',
                actions: ['select', 'setFirstPoint'],
              },
            ],
          },
        },
        waiting: {
          on: {
            EDITED: 'idle',
          },
          after: {
            1000: 'idle',
          },
        },
      },
    },
    {
      guards: {
        validSecondSeed: ({ cellMatrix, hovering, label, x, y, x1, y2 }) =>
          cellMatrix[hovering][label] === 1 && // same label
          (x !== x1 || y !== y2), // different point
        differentLabel: (ctx, evt) => ctx.label !== evt.label,
        onLabel: ({ hovering, label, cellMatrix }) => cellMatrix[hovering][label] === 1,
        notOnLabel: ({ hovering, label, cellMatrix }) => cellMatrix[hovering][label] === 0,
        onNoLabel: ({ hovering }) => hovering === 0,
      },
      actions: {
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setCellMatrix: assign({ cellMatrix: (_, { cellMatrix }) => cellMatrix }),
        setFirstPoint: assign({ x1: ({ x }) => x, y1: ({ y }) => y }),
        setSecondPoint: assign({ x2: ({ x }) => x, y2: ({ y }) => y }),
        setLabel: assign({ label: ({ selected }) => selected }),
        select: send('SELECT', { to: 'select' }),
        watershed: send(
          ({ label, x1, y1, x2, y2 }) => ({
            type: 'EDIT',
            action: 'watershed',
            args: {
              label,
              x1,
              y1,
              x2,
              y2,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createWatershedMachine;
