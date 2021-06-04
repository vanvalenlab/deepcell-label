import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createFloodMachine = ({ x, y, label, foreground, background }) => Machine(
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
        { cond: 'onBackground', actions: 'flood' },
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
      flood: sendParent(({ foreground, x, y}, event) => ({
        type: 'EDIT',
        action: 'flood',
        args: {
          label: foreground,
          x_location: x,
          y_location: y,
        },
      })),
    },
  }
);

export default createFloodMachine;
