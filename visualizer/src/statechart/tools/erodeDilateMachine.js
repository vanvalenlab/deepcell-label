import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards } from './toolUtils';

const createErodeDilateMachine = ({ label, foreground, background }) => Machine(
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
        { cond: 'shift' },
        { cond: 'onBackground', actions: 'erode' },
        { cond: 'onForeground', actions: 'dilate' },
        { actions: 'selectForeground' },
      ],
    },
  },
  {
    guards: toolGuards,
    actions: {
      ...toolActions,
      erode: sendParent(({ label }) => ({
        type: 'EDIT',
        action: 'erode',
        args: { label },
      })),
      dilate: sendParent(({ label }) => ({
        type: 'EDIT',
        action: 'dilate',
        args: { label },
      })),
      selectForeground: sendParent('SELECTFOREGROUND'),
    }
  }
);

export default createErodeDilateMachine;
