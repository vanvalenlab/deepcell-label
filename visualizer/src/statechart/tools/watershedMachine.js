import { Machine, assign, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';


const createWatershedMachine = ({ x, y, label, foreground, background }) => Machine(
  {
    context: {
      x,
      y,
      label,
      foreground,
      background,
      storedLabel: 0,
      storedX: 0,
      storedY: 0,
    },
    on: {
      COORDINATES: { actions: 'setCoordinates' },
      LABEL: { actions: 'setLabel' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          mouseup: [
            { cond: 'onNoLabel' },
            { target: 'clicked', actions: ['selectForeground', 'storeClick'] },
          ]
        },
      },
      clicked: {
        on: {
          FOREGROUND: { actions: 'setForeground', target: 'idle' },
          mouseup: { cond: 'validSecondSeed', target: 'idle', actions: ['watershed', 'newBackground'], },
        },
      },
    },
  },
  {
    guards: {
      ...toolGuards,
      validSecondSeed: ({ label, foreground, x, y, storedX, storedY}) => (
        label === foreground // same label
        && (x !== storedX || y !== storedY) // different point
      ),
      newForeground: (context, event) => context.foreground !== event.foreground,
    },
    actions: {
      ... toolActions,
      storeClick: assign({
        storedLabel: ({ label }) => label,
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
    }
  }
);

export default createWatershedMachine;
