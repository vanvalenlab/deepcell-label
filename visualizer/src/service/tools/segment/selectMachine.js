import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const createSelectMachine = ({ eventBuses }) =>
  Machine(
    {
      invoke: [{ id: 'selectedCells', src: fromEventBus('select', () => eventBuses.select) }],
      context: {
        hovering: null,
        foreground: null,
        background: null,
      },
      on: {
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
        HOVERING: { actions: 'setHovering' },
        mouseup: [
          {
            cond: 'doubleClick',
            actions: ['resetForeground', 'selectBackground'],
          },
          { cond: 'onForeground', actions: 'selectBackground' },
          { actions: 'selectForeground' },
        ],
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        selectForeground: send('SELECT_FOREGROUND', { to: 'selectedCells' }),
        selectBackground: send('SELECT_BACKGROUND', { to: 'selectedCells' }),
        resetForeground: send('RESET_FOREGROUND', { to: 'selectedCells' }),
      },
    }
  );

export default createSelectMachine;
