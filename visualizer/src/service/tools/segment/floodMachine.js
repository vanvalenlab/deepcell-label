import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const creatFloodMachine = ({ eventBuses }) =>
  Machine(
    {
      invoke: [
        { id: 'selectedCells', src: fromEventBus('flood', () => eventBuses.select) },
        { id: 'api', src: fromEventBus('flood', () => eventBuses.api) },
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
        mouseup: { actions: ['flood', 'selectBackground'] },
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        selectBackground: send('SELECT_BACKGROUND', { to: 'selectedCells' }),
        flood: send(
          ({ foreground, x, y }, event) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              label: foreground,
              x_location: x,
              y_location: y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default creatFloodMachine;
