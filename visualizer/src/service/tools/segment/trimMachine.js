import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const createTrimMachine = ({ eventBuses }) =>
  Machine(
    {
      invoke: [
        { id: 'selectedCells', src: fromEventBus('trim', () => eventBuses.select) },
        { id: 'api', src: fromEventBus('trim', () => eventBuses.api) },
      ],
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
        selectForeground: send('SELECT_FOREGROUND', { to: 'selectedCells' }),
        trim: send(
          ({ hovering, x, y }, event) => ({
            type: 'EDIT',
            action: 'trim_pixels',
            args: {
              label: hovering,
              x_location: x,
              y_location: y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createTrimMachine;
