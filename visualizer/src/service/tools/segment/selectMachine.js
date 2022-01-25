import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { selectedCellsEventBus } from '../../selectMachine';
import { toolActions, toolGuards } from './toolUtils';

const selectMachine = Machine(
  {
    invoke: [{ id: 'selectedCells', src: fromEventBus('select', () => selectedCellsEventBus) }],
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

export default selectMachine;
