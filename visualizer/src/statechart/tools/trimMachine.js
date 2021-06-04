import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createTrimMachine = ({ x, y, label, foreground, background }) => Machine(
  {
    context: {
      x,
      y,
      label,
      foreground,
      background,
    },
    on: {
      mousedown: [
        { cond: 'onNoLabel' },
        { cond: 'onBackground', actions: 'trim' },
        { actions: 'selectBackground' },
      ],
      COORDINATES: { actions: 'setCoordinates' },
      LABEL: { actions: 'setLabel' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
    }
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      selectBackground: sendParent('SELECTBACKGROUND'),
      trim: sendParent(({ label, x, y}, event) => ({
        type: 'EDIT',
        action: 'trim_pixels',
        args: {
          label: label,
          x_location: x,
          y_location: y,
        },
      })),
    }
  }
);

export default createTrimMachine;
