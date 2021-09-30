import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createSelectMachine = ({ label, foreground, background }) =>
  Machine(
    {
      context: {
        label,
        foreground,
        background,
      },
      on: {
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
        LABEL: { actions: 'setLabel' },
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
        selectForeground: sendParent('SELECT_FOREGROUND'),
        selectBackground: sendParent('SELECT_BACKGROUND'),
        resetForeground: sendParent('RESET_FOREGROUND'),
      },
    }
  );

export default createSelectMachine;
