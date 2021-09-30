import { assign, Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createWatershedMachine = () =>
  Machine(
    {
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
            FOREGROUND: { actions: 'setForeground', target: 'idle' },
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
      },
      actions: {
        ...toolActions,
        storeClick: assign({
          storedLabel: ({ hovering }) => hovering,
          storedX: ({ x }) => x,
          storedY: ({ y }) => y,
        }),
        selectForeground: sendParent('SELECT_FOREGROUND'),
        newBackground: sendParent({ type: 'BACKGROUND', background: 0 }),
        watershed: sendParent(({ storedLabel, storedX, storedY, x, y }) => ({
          type: 'EDIT',
          action: 'watershed',
          args: {
            label: storedLabel,
            x1_location: storedX,
            y1_location: storedY,
            x2_location: x,
            y2_location: y,
          },
        })),
      },
    }
  );

export default createWatershedMachine;
