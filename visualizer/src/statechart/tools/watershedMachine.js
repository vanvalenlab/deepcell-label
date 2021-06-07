import { Machine, assign, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const idleState = {
  initial: 'idle',
  onDone: 'clicked',
  states: {
    idle: {
      entry: 'resetMove',
      on: {
        mousedown: 'pressed',
      }
    },
    pressed: {
      on: {
        mousemove: [
          { cond: 'moved', target: 'dragged'}, 
          { actions: 'updateMove' }
        ],
        mouseup: [
          { target: 'idle', cond: 'onNoLabel' },
          { target: 'storeClick' }
        ]
      }
    },
    dragged: {
      on: { mouseup: 'idle' },
    },
    storeClick: {
      entry: ['selectForeground', 'storeClick'],
      always: { cond: ({ foreground, storedLabel }) => foreground === storedLabel, target: 'done' }
    },
    done: {
      type: 'final',
    }
  },
};

const clickedState = {
  initial: 'idle',
  onDone: 'idle',
  on: {
    FOREGROUND: { actions: 'setForeground', target: 'idle' },
  },
  states: {
    idle: {
      entry: 'resetMove',
      on: {
        mousedown: 'pressed',
      }
    },
    pressed: {
      on: {
        mousemove: [
          { cond: 'moved', target: 'dragged'}, 
          { actions: 'updateMove' }
        ],
        mouseup: { cond: 'validSecondSeed', target: 'done' },
      }
    },
    dragged: {
      on: { mouseup: 'idle' },
    },
    done: {
      entry: ['watershed', 'newBackground'],
      type: 'final',
    }
  },
};


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
      moveX: 0,
      moveY: 0,
    },
    on: {
      COORDINATES: { actions: 'setCoordinates' },
      LABEL: { actions: 'setLabel' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
    },
    initial: 'idle',
    states: {
      idle: idleState,
      clicked: clickedState,
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
      ...toolActions,
      storeClick: assign({
        storedLabel: ({ label }) => label,
        storedX: ({ x }) => x,
        storedY: ({ y }) => y,
      }),
      selectForeground: sendParent('SELECTFOREGROUND'),
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
