import { assign, Machine, send } from 'xstate';
import { apiEventBus } from '../../apiMachine';
import { fromEventBus } from '../../eventBus';
import { selectedCellsEventBus } from '../../selectMachine';
import { toolActions, toolGuards } from './toolUtils';

const watershedMachine = Machine(
  {
    invoke: [
      { id: 'selectedCells', src: fromEventBus('watershed', () => selectedCellsEventBus) },
      { id: 'api', src: fromEventBus('watershed', () => apiEventBus) },
    ],
    context: {
      x: null,
      y: null,
      hovering: null,
      foreground: null,
      background: null,
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
      selectForeground: send('SELECT_FOREGROUND', { to: 'selectedCells' }),
      newBackground: send({ type: 'BACKGROUND', background: 0 }, { to: 'selectedCells' }),
      watershed: send(
        ({ storedLabel, storedX, storedY, x, y }) => ({
          type: 'EDIT',
          action: 'watershed',
          args: {
            label: storedLabel,
            x1_location: storedX,
            y1_location: storedY,
            x2_location: x,
            y2_location: y,
          },
        }),
        { to: 'api' }
      ),
    },
  }
);

export default watershedMachine;
