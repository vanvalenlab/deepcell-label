import { Machine, send } from 'xstate';
import { apiEventBus } from '../../apiMachine';
import { canvasEventBus } from '../../canvasMachine';
import { fromEventBus } from '../../eventBus';
import { selectedCellsEventBus } from '../../selectMachine';
import { toolActions, toolGuards } from './toolUtils';

const floodMachine = Machine(
  {
    invoke: [
      { src: fromEventBus('flood', () => canvasEventBus) },
      { id: 'selectedCells', src: fromEventBus('flood', () => selectedCellsEventBus) },
      { id: 'api', src: fromEventBus('flood', () => apiEventBus) },
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

export default floodMachine;
