import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createSelectMachine = ({label, foreground, background }) => Machine(
  {
    context: {
      label,
      foreground,
      background,
    },
    on: {
      mousedown: [
        { cond: 'doubleClick', actions: ['selectBackground', 'resetForeground'] },
        { cond: 'onForeground', actions: 'selectBackground', },
        { actions: 'selectForeground' },
      ],
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
      LABEL: { actions: 'setLabel' },
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      selectForeground: sendParent('SELECTFOREGROUND'),
      selectBackground: sendParent('SELECTBACKGROUND'),
      resetForeground: sendParent({ type: 'FOREGROUND', foreground: 0 }),
    }
  }
);

export default createSelectMachine;