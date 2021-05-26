import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const autofitMachine = Machine(
  {
    context: {
      label: 0,
      foreground: 1,
      background: 0,
    },
    on: {
      mousedown: [
        { cond: 'shift' },
        { cond: 'onNoLabel' },
        { cond: 'onForeground', actions: 'autofit' },
        { actions: 'selectForeground' },
      ],
      LABEL: { actions: 'setLabel' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      autofit: sendParent(({ label }, event) => ({
        type: 'EDIT',
        action: 'active_contour',
        args: { label: label },
      })),
    }
  }
);

export default autofitMachine;
