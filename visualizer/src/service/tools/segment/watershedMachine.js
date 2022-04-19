import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const createWatershedMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('watershed', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('watershed', () => context.eventBuses.api) },
      ],
      context: {
        x: null,
        y: null,
        hovering: null,
        foreground: context.foreground,
        background: context.background,
        storedLabel: null,
        storedX: null,
        storedY: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: [
              { cond: 'onNoLabel' },
              {
                target: 'clicked',
                actions: ['selectForeground', 'storeClick'],
              },
            ],
          },
        },
        clicked: {
          on: {
            EXIT: 'idle',
            FOREGROUND: { cond: 'differentForeground', actions: 'setForeground', target: 'idle' },
            mouseup: {
              cond: 'validSecondSeed',
              target: 'idle',
              actions: ['watershed', 'newBackground'],
            },
          },
        },
      },
    },
    {
      guards: {
        ...toolGuards,
        validSecondSeed: ({ hovering, foreground, x, y, storedX, storedY }) =>
          hovering === foreground && // same label
          (x !== storedX || y !== storedY), // different point
        differentForeground: (context, event) => context.foreground !== event.foreground,
      },
      actions: {
        ...toolActions,
        storeClick: assign({
          storedLabel: ({ hovering }) => hovering,
          storedX: ({ x }) => x,
          storedY: ({ y }) => y,
        }),
        selectForeground: send('SELECT_FOREGROUND', { to: 'select' }),
        newBackground: send({ type: 'BACKGROUND', background: 0 }, { to: 'select' }),
        watershed: send(
          ({ storedLabel, storedX, storedY, x, y }) => ({
            type: 'EDIT',
            action: 'watershed',
            args: {
              label: storedLabel,
              x1: storedX,
              y1: storedY,
              x2: x,
              y2: y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createWatershedMachine;
