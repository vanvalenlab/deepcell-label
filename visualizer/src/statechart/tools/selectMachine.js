import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards, toolServices } from './toolUtils';

const createSelectMachine = ({label, foreground, background }) => Machine(
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
            { target: 'idle', cond: 'doubleClick', actions: ['selectBackground', 'resetForeground'] },
            { target: 'idle', cond: 'onForeground', actions: 'selectBackground', },
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
      selectForeground: sendParent('SELECTFOREGROUND'),
      selectBackground: sendParent('SELECTBACKGROUND'),
      resetForeground: sendParent({ type: 'FOREGROUND', foreground: 0 }),
    }
  }
);

export default createSelectMachine;