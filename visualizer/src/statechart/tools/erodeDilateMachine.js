import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards, toolServices } from './toolUtils';

const createErodeDilateMachine = ({ label, foreground, background }) => Machine(
  {
    context: {
      label,
      foreground,
      background,
      moveX: 0,
      moveY: 0,
    },
    on: {
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
      LABEL: { actions: 'setLabel' },
    },
    invoke: { 
      src: 'listenForMouseUp',
    },
    initial: 'idle',
    states: {
      idle: {
        entry: 'resetMove',
        on: {
          mousedown: 'pressed',
        }
      },
      pressed: {
        on: {
          mousemove: [
            { cond: 'moved', target: 'dragged'}, 
            { actions: 'updateMove' }
          ],
          mouseup: [
            { target: 'idle', cond: 'onNoLabel' },
            { target: 'idle', cond: 'shift' },
            { target: 'idle', cond: 'onBackground', actions: 'erode' },
            { target: 'idle', cond: 'onForeground', actions: 'dilate' },
            { target: 'idle', actions: 'selectForeground' },
          ],
        }
      },
      dragged: {
        on: { mouseup: 'idle' },
      },
    },
  },
  {
    services: toolServices,
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
