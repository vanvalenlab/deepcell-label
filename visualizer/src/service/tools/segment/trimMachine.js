import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createTrimMachine = ({ x, y, label, foreground, background }) =>
  Machine(
    {
      context: {
        x,
        y,
        label,
        foreground,
        background,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        LABEL: { actions: 'setLabel' },
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
        mouseup: [{ cond: 'onNoLabel' }, { actions: ['selectForeground', 'trim'] }],
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        selectForeground: sendParent('SELECT_FOREGROUND'),
        trim: sendParent(({ label, x, y }, event) => ({
          type: 'EDIT',
          action: 'trim_pixels',
          args: {
            label: label,
            x_location: x,
            y_location: y,
          },
        })),
      },
    }
  );

export default createTrimMachine;
