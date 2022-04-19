import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const createSelectMachine = (context) =>
  Machine(
    {
      invoke: [{ id: 'select', src: fromEventBus('select', () => context.eventBuses.select) }],
      context: {
        hovering: null,
        foreground: context.foreground,
        background: context.background,
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
        selectForeground: send('SELECT_FOREGROUND', { to: 'select' }),
        selectBackground: send('SELECT_BACKGROUND', { to: 'select' }),
        resetForeground: send('RESET_FOREGROUND', { to: 'select' }),
      },
    }
  );

export default createSelectMachine;
