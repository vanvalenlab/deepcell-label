import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createTrimMachine = () =>
  Machine(
    {
      context: {
        x: null,
        y: null,
        label: null,
        foreground: null,
        background: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
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
        trim: sendParent(({ hovering, x, y }, event) => ({
          type: 'EDIT',
          action: 'trim_pixels',
          args: {
            label: hovering,
            x_location: x,
            y_location: y,
          },
        })),
      },
    }
  );

export default createTrimMachine;
