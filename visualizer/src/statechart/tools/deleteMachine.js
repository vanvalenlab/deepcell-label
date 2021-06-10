import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createDeleteMachine = ({label, foreground, background }) => Machine(
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
        { cond: 'onNoLabel' },
        { cond: 'onBackground', actions: 'delete' },
        { actions: 'selectBackground' },
      ],
    }
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      selectBackground: sendParent('SELECTBACKGROUND'),
      delete: sendParent(({ label }, event) => ({
        type: 'EDIT',
        action: 'replace_single',
        args: { label_1: 0, label_2: label },
      })),
    }
  }
);

export default createDeleteMachine;