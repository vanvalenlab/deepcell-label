import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createFloodMachine = () =>
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
        mouseup: { actions: ['flood', 'selectBackground'] },
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        selectBackground: sendParent('SELECT_BACKGROUND'),
        flood: sendParent(({ foreground, x, y }, event) => ({
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
