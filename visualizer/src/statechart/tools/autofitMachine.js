import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createAutofitMachine = ({ label, foreground, background }) => Machine(
  {
    context: {
      label,
      foreground,
      background,
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
      selectForeground: sendParent('SELECTFOREGROUND'),
    }
  }
);

export default createAutofitMachine;
