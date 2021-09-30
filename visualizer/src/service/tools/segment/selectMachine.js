import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const selectMachine = Machine(
  {
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
        { actions: [(c, e) => console.log(c), 'selectForeground'] },
      ],
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      selectForeground: sendParent('SELECT_FOREGROUND'),
      selectBackground: sendParent('SELECT_BACKGROUND'),
      resetForeground: sendParent('RESET_FOREGROUND'),
    },
  }
);

export default selectMachine;
